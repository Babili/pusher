import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { Logger } from "../../app/logger.js";
import { SocketStore } from "../../app/server/socket_store.js";
import { createSilentLogger } from "../support/fixtures.js";

function createFakeRedis() {
  const values = new Map();
  const handlers = {};
  return {
    values,
    handlers,
    on: (eventName, handler) => { handlers[eventName] = handler; },
    connect: async() => true,
    set: async(key, value) => { values.set(key, value); return "OK"; },
    exists: async(key) => (values.has(key) ? 1 : 0),
    del: async(key) => (values.delete(key) ? 1 : 0)
  };
}

describe("SocketStore", () => {
  let redis;
  let store;

  beforeEach(() => {
    store = new SocketStore({ config: { redis: { url: "redis://localhost:6379" } }, logger: createSilentLogger() });
    redis = createFakeRedis();
    store.redisPresenceStore = redis;
  });

  it("keys presence by user and platform", () => {
    assert.equal(store.key("bob", "platform-1"), "bob_platform-1");
  });

  it("marks a user present in Redis and keeps its socket in memory", async() => {
    const socket = {};

    await store.add("bob", "platform-1", socket);

    assert.ok(Date.parse(redis.values.get("bob_platform-1")));
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

  it("logs Redis connection errors instead of throwing", async() => {
    const logger = new Logger();
    logger.logger.silent = true;
    store.app.logger = logger;
    await store.connect();

    assert.doesNotThrow(() => redis.handlers.error(new Error("connection lost")));
  });
});
