import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { after, afterEach, before, describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import fetch from "node-fetch";
import { io as connectClient } from "socket.io-client";
import { connectDependencies, redisUrl, uniqueQueueName, waitFor, waitUntil } from "../support/dependencies.js";
import { startFakeEngine } from "../support/fake_engine.js";
import { platformId, publicKey, signToken } from "../support/fixtures.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const presenceKey = `dave_${platformId}`;

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

describe("babili-pusher process", () => {
  let engine;
  let redis;
  let rabbitMq;
  const pushers = [];
  const clients = [];
  const queueNames = [];

  async function startPusher(environment = {}) {
    const port = await findFreePort();
    const queueName = uniqueQueueName();
    queueNames.push(queueName);
    const child = spawn(process.execPath, ["babili_pusher.js"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(port),
        ENGINE_HOST: engine.host,
        ENGINE_PORT: String(engine.port),
        REDIS_URL: redisUrl,
        RABBITMQ_QUEUE_NAME: queueName,
        ...environment
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    pushers.push({ child, exited });
    await Promise.race([
      waitUntil(() => output.includes("Pusher started."), 15000),
      exited.then(({ code }) => { throw new Error(`Pusher exited with code ${code}:\n${output}`); })
    ]);
    return { child, exited, url: `http://127.0.0.1:${port}` };
  }

  async function connectDave(pusher) {
    const client = connectClient(pusher.url, { auth: { token: signToken("dave") }, transports: ["websocket"], reconnection: false, forceNew: true });
    clients.push(client);
    await waitFor(client, "connected");
    return client;
  }

  before(async() => {
    ({ redis, rabbitMq } = await connectDependencies());
    engine = await startFakeEngine({ [platformId]: { userRsaPublic: publicKey } });
  });

  afterEach(async() => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    for (const { child, exited } of pushers.splice(0)) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
      await exited;
    }
    await redis.del(presenceKey);
  });

  after(async() => {
    const channel = await rabbitMq.createChannel();
    for (const queueName of queueNames) {
      await channel.deleteQueue(queueName);
    }
    await channel.deleteExchange(process.env.RABBITMQ_EXCHANGE_NAME);
    await rabbitMq.close();
    await redis.close();
    await engine.close();
  });

  it("exits cleanly on SIGTERM", async() => {
    const pusher = await startPusher();

    pusher.child.kill("SIGTERM");

    assert.deepEqual(await pusher.exited, { code: 0, signal: null });
  });

  it("sends the configured HSTS header from the first handshake", async() => {
    const pusher = await startPusher({ HSTS_HEADER: "max-age=31536000" });

    const response = await fetch(`${pusher.url}/socket.io/?EIO=4&transport=polling`);

    assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  });

  it("keeps a connected user present beyond the presence TTL", async() => {
    const pusher = await startPusher({ PRESENCE_TTL_SECONDS: "1" });
    await connectDave(pusher);

    await new Promise((resolve) => setTimeout(resolve, 2500));

    assert.equal(await redis.exists(presenceKey), 1);
  });

  it("lets the presence of its users expire when the process dies", async() => {
    const pusher = await startPusher({ PRESENCE_TTL_SECONDS: "1" });
    await connectDave(pusher);
    assert.equal(await redis.exists(presenceKey), 1);

    pusher.child.kill("SIGKILL");
    await pusher.exited;

    await waitUntil(async() => (await redis.exists(presenceKey)) === 0, 5000);
  });
});
