import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { SocketServer } from "../../app/server/socket_server.js";
import { createSilentLogger, otherKeys, platformId, publicKey, signToken } from "../support/fixtures.js";

function createApp(config = {}) {
  return {
    logger: createSilentLogger(),
    config: {
      port: 0,
      redis: { url: "redis://localhost:6379" },
      engine: { host: "localhost", port: 3000 },
      headers: { hstsHeader: null },
      authentication: { jwtAlgorithms: ["RS256"] },
      ...config
    }
  };
}

function createFakeSocket(handshake = {}) {
  const handlers = {};
  return {
    handshake,
    emitted: [],
    handlers,
    emit(eventName, payload) { this.emitted.push([eventName, payload]); },
    on: (eventName, handler) => { handlers[eventName] = handler; }
  };
}

function authenticate(server, socket) {
  return new Promise((resolve, reject) => {
    server._authenticateSocketConnection(socket, resolve).catch(reject);
  });
}

describe("SocketServer", () => {
  let server;

  beforeEach(() => {
    server = new SocketServer(createApp());
    server.platformStore = { get: mock.fn(async() => ({ userRsaPublic: publicKey })) };
    server.socketStore = {
      add: mock.fn(async() => true),
      remove: mock.fn(async() => undefined),
      get: mock.fn(() => undefined),
      isPresent: mock.fn(async() => false)
    };
  });

  describe("_authenticateSocketConnection", () => {
    it("accepts a token signed with the platform key in the auth payload", async() => {
      const socket = createFakeSocket({ auth: { token: signToken("bob") } });

      const error = await authenticate(server, socket);

      assert.equal(error, undefined);
      assert.equal(socket.decodedToken.sub, "bob");
      assert.equal(socket.decodedToken.data.platformId, platformId);
      assert.equal(server.platformStore.get.mock.calls[0].arguments[0], platformId);
    });

    it("accepts a token passed in the query string", async() => {
      const socket = createFakeSocket({ query: { token: signToken("bob") } });

      assert.equal(await authenticate(server, socket), undefined);
    });

    const rejectedHandshakes = {
      "no token": () => ({}),
      "a token signed with another key": () => ({ auth: { token: signToken("bob", { key: otherKeys.privateKey }) } }),
      "a token signed with HS256 using the public key": () => ({ auth: { token: signToken("bob", { key: publicKey, algorithm: "HS256" }) } }),
      "an expired token": () => ({ auth: { token: signToken("bob", { expiresIn: -10 }) } }),
      "a token without platform": () => ({ auth: { token: signToken("bob", { payloadPlatformId: null }) } }),
      "a malformed token": () => ({ auth: { token: "not-a-jwt" } })
    };

    for (const [description, buildHandshake] of Object.entries(rejectedHandshakes)) {
      it(`rejects ${description}`, async() => {
        const socket = createFakeSocket(buildHandshake());

        const error = await authenticate(server, socket);

        assert.equal(error?.message, "Authentication error");
        assert.equal(socket.decodedToken, undefined);
      });
    }

    it("enforces the configured audience", async() => {
      server.app.config.authentication.jwtAudience = "babili";

      const valid = await authenticate(server, createFakeSocket({ auth: { token: signToken("bob", { audience: "babili" }) } }));
      const invalid = await authenticate(server, createFakeSocket({ auth: { token: signToken("bob", { audience: "other" }) } }));

      assert.equal(valid, undefined);
      assert.equal(invalid?.message, "Authentication error");
    });

    it("rejects the connection when the platform cannot be fetched", async() => {
      server.platformStore.get = async() => { throw new Error("Engine responded with code: 404"); };

      const error = await authenticate(server, createFakeSocket({ auth: { token: signToken("bob") } }));

      assert.equal(error?.message, "Authentication error");
    });
  });

  describe("_jwtVerificationOptions", () => {
    it("only restricts algorithms when no audience is configured", () => {
      assert.deepEqual(server._jwtVerificationOptions(), { algorithms: ["RS256"] });
    });

    it("adds the configured audience", () => {
      server.app.config.authentication.jwtAudience = "babili";

      assert.deepEqual(server._jwtVerificationOptions(), { algorithms: ["RS256"], audience: "babili" });
    });
  });

  describe("_handleSocketConnection", () => {
    let socket;

    beforeEach(async() => {
      socket = createFakeSocket();
      socket.decodedToken = { sub: "bob", data: { platformId } };
      server.io = { engine: { on: mock.fn() } };
      await server._handleSocketConnection(socket);
    });

    it("registers the socket and sends its device session id", () => {
      assert.deepEqual(server.socketStore.add.mock.calls[0].arguments, ["bob", platformId, socket]);
      assert.match(socket.deviceSessionId, /^[0-9a-f-]{36}$/);
      assert.deepEqual(socket.emitted, [["connected", { deviceSessionId: socket.deviceSessionId }]]);
    });

    it("answers ping with pong", () => {
      socket.handlers.ping();

      assert.deepEqual(socket.emitted.at(-1), ["pong", {}]);
    });

    it("unregisters the socket on disconnect", async() => {
      await socket.handlers.disconnect();

      assert.deepEqual(server.socketStore.remove.mock.calls[0].arguments, ["bob", platformId, socket]);
    });

    it("does not add the HSTS header when it is not configured", () => {
      assert.equal(server.io.engine.on.mock.callCount(), 0);
    });

    it("adds the configured HSTS header", async() => {
      server.app.config.headers.hstsHeader = "max-age=31536000";
      const headerSocket = createFakeSocket();
      headerSocket.decodedToken = { sub: "alice", data: { platformId } };

      await server._handleSocketConnection(headerSocket);
      const [eventName, addHeaders] = server.io.engine.on.mock.calls[0].arguments;
      const headers = {};
      addHeaders(headers);

      assert.equal(eventName, "headers");
      assert.deepEqual(headers, { "Strict-Transport-Security": "max-age=31536000" });
    });
  });

  describe("_buildMessageView", () => {
    const message = {
      publicId: "message-public-id",
      content: "Hello Bob",
      contentType: "text",
      createdAt: "2026-10-03T10:15:30Z",
      roomPublicId: "room-public-id",
      senderPublicId: "alice"
    };

    it("builds a JSON:API view with the room and the sender", () => {
      assert.deepEqual(server._buildMessageView(message), {
        data: {
          id: "message-public-id",
          attributes: { content: "Hello Bob", contentType: "text", createdAt: "2026-10-03T10:15:30Z" },
          relationships: {
            room: { data: { type: "room", id: "room-public-id" } },
            sender: { data: { type: "user", id: "alice" } }
          }
        }
      });
    });

    it("omits the sender relationship for messages without sender", () => {
      const view = server._buildMessageView({ ...message, senderPublicId: null });

      assert.deepEqual(Object.keys(view.data.relationships), ["room"]);
    });
  });

  describe("newMessage", () => {
    const message = { publicId: "message-public-id", roomPublicId: "room-public-id", deviceSessionId: "sender-device" };

    it("does nothing when the recipient is not present", async() => {
      await server.newMessage("bob", platformId, message);

      assert.equal(server.socketStore.get.mock.callCount(), 0);
    });

    it("emits to every socket of the recipient except the originating device", async() => {
      const originSocket = createFakeSocket();
      originSocket.deviceSessionId = "sender-device";
      const otherSocket = createFakeSocket();
      otherSocket.deviceSessionId = "other-device";
      server.socketStore.isPresent = mock.fn(async() => true);
      server.socketStore.get = mock.fn(() => [originSocket, otherSocket]);

      await server.newMessage("alice", platformId, message);

      assert.deepEqual(server.socketStore.isPresent.mock.calls[0].arguments, ["alice", platformId]);
      assert.deepEqual(originSocket.emitted, []);
      assert.deepEqual(otherSocket.emitted, [["new message", server._buildMessageView(message)]]);
    });
  });

  describe("_waitAndSendNewMessage", () => {
    beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
    afterEach(() => mock.timers.reset());

    it("retries every 2 seconds until the recipient socket is registered", () => {
      const socket = createFakeSocket();
      let sockets;
      server.socketStore.get = mock.fn(() => sockets);

      server._waitAndSendNewMessage("bob", platformId, "sender-device", { data: {} });
      mock.timers.tick(2000);
      sockets = [socket];
      mock.timers.tick(2000);

      assert.equal(server.socketStore.get.mock.callCount(), 3);
      assert.deepEqual(socket.emitted, [["new message", { data: {} }]]);
    });

    it("gives up after 10 retries", () => {
      server.socketStore.get = mock.fn(() => []);

      server._waitAndSendNewMessage("bob", platformId, "sender-device", { data: {} });
      for (let elapsed = 0; elapsed < 60000; elapsed += 2000) {
        mock.timers.tick(2000);
      }

      assert.equal(server.socketStore.get.mock.callCount(), 11);
    });
  });
});
