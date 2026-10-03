import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { setImmediate } from "node:timers";
import { Logger } from "../../app/logger.js";
import { SocketStore } from "../../app/server/socket_store.js";
import { createSilentLogger } from "../support/fixtures.js";

function createFakeRedis() {
  const values = new Map();
  const ttls = new Map();
  const handlers = {};
  return {
    values,
    ttls,
    handlers,
    on: (eventName, handler) => { handlers[eventName] = handler; },
    connect: async() => true,
    set: async(key, value, options) => { values.set(key, value); ttls.set(key, options?.EX); return "OK"; },
    expire: async(key, seconds) => { ttls.set(key, seconds); return values.has(key) ? 1 : 0; },
    exists: async(key) => (values.has(key) ? 1 : 0),
    del: async(key) => (values.delete(key) ? 1 : 0)
  };
}

describe("SocketStore", () => {
  let redis;
  let store;

  beforeEach(() => {
    store = new SocketStore({ config: { redis: { url: "redis://localhost:6379", presenceTtlSeconds: 60 } }, logger: createSilentLogger() });
    redis = createFakeRedis();
    store.redisPresenceStore = redis;
  });

  afterEach(() => store.stop());

  it("keys presence by user and platform", () => {
    assert.equal(store.key("bob", "platform-1"), "bob_platform-1");
  });

  it("marks a user present in Redis and keeps its socket in memory", async() => {
    const socket = {};

    await store.add("bob", "platform-1", socket);

    assert.ok(Date.parse(redis.values.get("bob_platform-1")));
    assert.equal(redis.ttls.get("bob_platform-1"), 60);
    assert.deepEqual(store.get("bob", "platform-1"), [socket]);
    assert.equal(await store.isPresent("bob", "platform-1"), true);
  });

  it("isolates the same user on different platforms", async() => {
    await store.add("bob", "platform-1", {});

    assert.equal(await store.isPresent("bob", "platform-2"), false);
    assert.equal(store.get("bob", "platform-2"), undefined);
  });

  it("keeps the user present while another of its sockets is connected", async() => {
    const firstSocket = { id: 1 };
    const secondSocket = { id: 2 };
    await store.add("bob", "platform-1", firstSocket);
    await store.add("bob", "platform-1", secondSocket);

    await store.remove("bob", "platform-1", firstSocket);

    assert.deepEqual(store.get("bob", "platform-1"), [secondSocket]);
    assert.equal(await store.isPresent("bob", "platform-1"), true);
  });

  it("marks the user absent when its last socket disconnects", async() => {
    const socket = {};
    await store.add("bob", "platform-1", socket);

    await store.remove("bob", "platform-1", socket);

    assert.equal(store.get("bob", "platform-1"), undefined);
    assert.equal(await store.isPresent("bob", "platform-1"), false);
  });

  it("keeps the other sockets when removing a socket it does not know", async() => {
    const firstSocket = { id: 1 };
    const secondSocket = { id: 2 };
    await store.add("bob", "platform-1", firstSocket);
    await store.add("bob", "platform-1", secondSocket);

    await store.remove("bob", "platform-1", { id: 3 });

    assert.deepEqual(store.get("bob", "platform-1"), [firstSocket, secondSocket]);
    assert.equal(await store.isPresent("bob", "platform-1"), true);
  });

  it("logs Redis connection errors instead of throwing", async() => {
    const logger = new Logger();
    logger.logger.silent = true;
    store.app.logger = logger;
    await store.connect();

    assert.doesNotThrow(() => redis.handlers.error(new Error("connection lost")));
  });

  describe("presence refresh", () => {
    beforeEach(() => mock.timers.enable({ apis: ["setInterval"] }));
    afterEach(() => mock.timers.reset());

    it("extends the presence of connected users every third of the TTL", async() => {
      await store.connect();
      await store.add("bob", "platform-1", {});
      redis.ttls.set("bob_platform-1", 1);

      mock.timers.tick(20000);
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(redis.ttls.get("bob_platform-1"), 60);
    });

    it("stops refreshing once stopped", async() => {
      await store.connect();
      await store.add("bob", "platform-1", {});
      redis.ttls.set("bob_platform-1", 1);

      store.stop();
      mock.timers.tick(20000);
      await new Promise((resolve) => setImmediate(resolve));

      assert.equal(redis.ttls.get("bob_platform-1"), 1);
    });

    it("does not refresh users that left", async() => {
      const socket = {};
      await store.add("bob", "platform-1", socket);
      await store.remove("bob", "platform-1", socket);

      await store.refreshPresences();

      assert.equal(redis.ttls.has("bob_platform-1"), true);
      assert.equal(redis.values.has("bob_platform-1"), false);
    });

    it("logs refresh failures instead of rejecting", async() => {
      await store.add("bob", "platform-1", {});
      redis.expire = async() => { throw new Error("connection lost"); };

      await store.refreshPresences();

      assert.match(store.app.logger.entries.at(-1).message, /Unable to refresh presences: Error: connection lost/);
    });
  });
});
