import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

const variables = ["PORT", "ENGINE_HOST", "ENGINE_PORT", "SENTRY_DSN", "HSTS_HEADER", "REDIS_URL", "JWT_AUDIENCE", "JWT_ALGORITHMS"];
const initialEnvironment = Object.fromEntries(variables.map((name) => [name, process.env[name]]));

let importCount = 0;
async function loadConfiguration(environment) {
  for (const name of variables) {
    delete process.env[name];
  }
  Object.assign(process.env, environment);
  const { configuration } = await import(`../../config/config.js?load=${importCount++}`);
  return configuration;
}

describe("configuration", () => {
  afterEach(() => {
    for (const [name, value] of Object.entries(initialEnvironment)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it("reads every setting from the environment", async() => {
    const configuration = await loadConfiguration({
      PORT: "3000",
      ENGINE_HOST: "engine",
      ENGINE_PORT: "3001",
      SENTRY_DSN: "https://key@sentry.example/1",
      HSTS_HEADER: "max-age=31536000",
      REDIS_URL: "redis://redis:6379",
      JWT_AUDIENCE: "babili",
      JWT_ALGORITHMS: "RS256,RS512"
    });

    assert.deepEqual(configuration, {
      port: "3000",
      engine: { host: "engine", port: "3001" },
      sentryDsn: "https://key@sentry.example/1",
      headers: { hstsHeader: "max-age=31536000" },
      redis: { url: "redis://redis:6379" },
      authentication: { jwtAudience: "babili", jwtAlgorithms: ["RS256", "RS512"] }
    });
  });

  it("only allows RS256 and sends no HSTS header by default", async() => {
    const configuration = await loadConfiguration({});

    assert.deepEqual(configuration.authentication.jwtAlgorithms, ["RS256"]);
    assert.equal(configuration.headers.hstsHeader, null);
  });
});
