import { randomUUID } from "node:crypto";
import { clearTimeout } from "node:timers";
import amqp from "amqplib";
import { createClient } from "redis";

export const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
process.env.RABBITMQ_USER ||= "guest";
process.env.RABBITMQ_PASSWORD ||= "guest";
process.env.RABBITMQ_EXCHANGE_NAME = `babili-pusher-test-${randomUUID()}`;
export const rabbitMqUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST || "localhost"}:${process.env.RABBITMQ_PORT || 5672}`;

export function uniqueQueueName() {
  return `babili-pusher-test-${randomUUID()}`;
}

export async function connectDependencies() {
  const redis = createClient({ url: redisUrl, socket: { reconnectStrategy: false } });
  redis.on("error", () => {});
  try {
    await redis.connect();
    const rabbitMq = await amqp.connect(rabbitMqUrl);
    return { redis, rabbitMq };
  } catch (error) {
    redis.destroy();
    throw new Error(`Redis and RabbitMQ must be running for integration tests (docker compose -f docker-compose.test.yml up -d): ${error.message}`, { cause: error });
  }
}

export function waitFor(emitter, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No '${eventName}' received within ${timeoutMs}ms`)), timeoutMs);
    emitter.once(eventName, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export async function waitUntil(condition, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > deadline) {
      throw new Error("Condition not met in time");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
