import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export const platformId = "platform-1";

export const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

export const otherKeys = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

export function signToken(userId, { key = privateKey, algorithm = "RS256", payloadPlatformId = platformId, ...options } = {}) {
  return jwt.sign({ data: { platformId: payloadPlatformId } }, key, { subject: userId, algorithm, ...options });
}

export function createMessageEvent(overrides = {}) {
  return {
    meta: {
      id: "event-1",
      name: "create message",
      status: "new",
      emitter: "BabiliEngine",
      kind: "entity_change",
      timestamp: "2026-10-03 10:15:30 UTC"
    },
    data: {
      entityId: 42,
      changes: {
        publicId: [null, "message-public-id"],
        content: [null, "Hello Bob"],
        senderId: [null, 7],
        contentType: [null, "text"],
        deviceSessionId: [null, "sender-device-session"]
      },
      associations: { roomId: 3 },
      userMetadata: {
        roomPublicId: "room-public-id",
        senderPublicId: "alice",
        recipientPublicIds: ["bob", "carol"],
        platformId
      },
      ...overrides
    }
  };
}

export function createSilentLogger() {
  const entries = [];
  const log = (level) => (message) => entries.push({ level, message });
  return { entries, debug: log("debug"), info: log("info"), warn: log("warn"), err: log("err") };
}
