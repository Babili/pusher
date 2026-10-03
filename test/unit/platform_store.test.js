import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { PlatformStore } from "../../app/server/platform_store.js";
import { startFakeEngine } from "../support/fake_engine.js";
import { createSilentLogger, platformId, publicKey } from "../support/fixtures.js";

describe("PlatformStore", () => {
  let engine;
  let store;

  before(async() => {
    engine = await startFakeEngine({ [platformId]: { userRsaPublic: publicKey } });
  });

  after(() => engine.close());

  beforeEach(() => {
    engine.requests.length = 0;
    store = new PlatformStore({ config: { engine: { host: engine.host, port: engine.port } }, logger: createSilentLogger() });
  });

  it("fetches the platform attributes from the engine", async() => {
    const attributes = await store.get(platformId);

    assert.deepEqual(attributes, { userRsaPublic: publicKey });
    assert.deepEqual(engine.requests, [`/internal/platforms/${platformId}`]);
  });

  it("caches platforms after the first fetch", async() => {
    await store.get(platformId);
    await store.get(platformId);

    assert.equal(engine.requests.length, 1);
  });

  it("rejects when the engine does not know the platform", async() => {
    await assert.rejects(store.get("unknown-platform"), /Engine responded with code: 404/);
  });
});
