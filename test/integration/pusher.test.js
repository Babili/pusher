import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { after, afterEach, before, describe, it } from "node:test";
import { io as connectClient } from "socket.io-client";
import { App } from "../../app/app.js";
import { connectDependencies, redisUrl, uniqueQueueName, waitFor, waitUntil } from "../support/dependencies.js";
import { startFakeEngine } from "../support/fake_engine.js";
import { createMessageEvent, otherKeys, platformId, publicKey, signToken } from "../support/fixtures.js";

const otherPlatformId = "platform-2";
const createMessageRoutingKey = "new.BabiliEngine.entity_change.create message";
const hstsHeader = "max-age=31536000";
process.env.RABBITMQ_QUEUE_NAME = uniqueQueueName();

describe("babili-pusher", () => {
  let app;
  let engine;
  let redis;
  let rabbitMq;
  let publisher;
  let pusherUrl;
  const clients = [];

  function connect(userId, options = {}) {
    const token = options.token ?? signToken(userId, options);
    const client = connectClient(pusherUrl, { auth: { token }, transports: ["websocket"], reconnection: false, forceNew: true });
    clients.push(client);
    return client;
  }

  async function connectUser(userId, options) {
    const client = connect(userId, options);
    const { deviceSessionId } = await waitFor(client, "connected");
    return { client, deviceSessionId };
  }

  function publish(event) {
    publisher.publish(process.env.RABBITMQ_EXCHANGE_NAME, createMessageRoutingKey, Buffer.from(JSON.stringify(event)));
  }

  before(async() => {
    ({ redis, rabbitMq } = await connectDependencies());
    await redis.del(["alice", "bob", "carol"].flatMap((userId) => [`${userId}_${platformId}`, `${userId}_${otherPlatformId}`]));
    publisher = await rabbitMq.createChannel();
    engine = await startFakeEngine({
      [platformId]: { userRsaPublic: publicKey },
      [otherPlatformId]: { userRsaPublic: otherKeys.publicKey }
    });
    app = new App({
      port: 0,
      engine: { host: engine.host, port: engine.port },
      headers: { hstsHeader },
      redis: { url: redisUrl, presenceTtlSeconds: 60 },
      authentication: { jwtAlgorithms: ["RS256"] }
    });
    app.logger.logger.silent = true;
    await app.start();
    pusherUrl = `http://127.0.0.1:${app.socketServer.io.httpServer.address().port}`;
  });

  afterEach(async() => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await waitUntil(() => Object.keys(app.socketServer.socketStore.store).length === 0);
  });

  after(async() => {
    app.socketServer.stop();
    await app.socketServer.socketStore.redisPresenceStore.close();
    await new Promise((resolve) => app.happn.eventConsumer.channel.connection.close(resolve));
    await publisher.deleteQueue(process.env.RABBITMQ_QUEUE_NAME);
    await publisher.deleteExchange(process.env.RABBITMQ_EXCHANGE_NAME);
    await rabbitMq.close();
    await redis.close();
    await engine.close();
  });

  describe("authentication", () => {
    it("rejects a connection without token", async() => {
      const error = await waitFor(connect("bob", { token: "" }), "connect_error");

      assert.equal(error.message, "Authentication error");
    });

    it("rejects a token that is not signed by the platform key", async() => {
      const error = await waitFor(connect("bob", { key: otherKeys.privateKey }), "connect_error");

      assert.equal(error.message, "Authentication error");
    });

    it("rejects a token for a platform unknown to the engine and keeps serving", async() => {
      const error = await waitFor(connect("mallory", { payloadPlatformId: "unknown-platform" }), "connect_error");

      assert.equal(error.message, "Authentication error");
      await connectUser("bob");
    });

    it("accepts a token signed by the platform key fetched from the engine", async() => {
      const { deviceSessionId } = await connectUser("bob");

      assert.match(deviceSessionId, /^[0-9a-f-]{36}$/);
      assert.ok(engine.requests.includes(`/internal/platforms/${platformId}`));
    });
  });

  describe("presence", () => {
    it("marks a connected user present in Redis", async() => {
      await connectUser("bob");

      assert.equal(await redis.exists(`bob_${platformId}`), 1);
    });

    it("keeps the user present until its last socket disconnects", async() => {
      const first = await connectUser("bob");
      const second = await connectUser("bob");

      first.client.disconnect();
      await waitUntil(() => app.socketServer.socketStore.get("bob", platformId)?.length === 1);
      assert.equal(await redis.exists(`bob_${platformId}`), 1);

      second.client.disconnect();
      await waitUntil(async() => (await redis.exists(`bob_${platformId}`)) === 0);
    });

    it("answers ping with pong", async() => {
      const { client } = await connectUser("bob");

      client.emit("ping");

      assert.deepEqual(await waitFor(client, "pong"), {});
    });
  });

  describe("message delivery", () => {
    const expectedView = {
      data: {
        id: "message-public-id",
        attributes: { content: "Hello Bob", contentType: "text", createdAt: "2026-10-03T10:15:30Z" },
        relationships: {
          room: { data: { type: "room", id: "room-public-id" } },
          sender: { data: { type: "user", id: "alice" } }
        }
      }
    };

    it("pushes a created message to its recipients and to the sender's other devices", async() => {
      const aliceOrigin = await connectUser("alice");
      const aliceOther = await connectUser("alice");
      const bob = await connectUser("bob");
      const originMessages = [];
      aliceOrigin.client.on("new message", (view) => originMessages.push(view));

      const event = createMessageEvent();
      event.data.changes.deviceSessionId = [null, aliceOrigin.deviceSessionId];
      publish(event);

      const [bobView, aliceView] = await Promise.all([
        waitFor(bob.client, "new message"),
        waitFor(aliceOther.client, "new message")
      ]);
      assert.deepEqual(bobView, expectedView);
      assert.deepEqual(aliceView, expectedView);
      assert.deepEqual(originMessages, []);
    });

    it("does not push a message to the same user on another platform", async() => {
      const bob = await connectUser("bob");
      const bobOnOtherPlatform = await connectUser("bob", { key: otherKeys.privateKey, payloadPlatformId: otherPlatformId });
      const otherPlatformMessages = [];
      bobOnOtherPlatform.client.on("new message", (view) => otherPlatformMessages.push(view));

      publish(createMessageEvent());

      assert.deepEqual(await waitFor(bob.client, "new message"), expectedView);
      assert.deepEqual(otherPlatformMessages, []);
    });
  });

  describe("HSTS", () => {
    it("registers the header listener once whatever the number of connections", async() => {
      await connectUser("alice");
      await connectUser("bob");
      await connectUser("carol");

      assert.equal(app.socketServer.io.engine.listenerCount("headers"), 1);
    });
  });
});
