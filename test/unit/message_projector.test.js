import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import Event from "@crepesourcing/happn/dist/event.js";
import SubscriptionRepository from "@crepesourcing/happn/dist/subscription_repository.js";
import { MessageProjector } from "../../app/server/message_projector.js";
import { createMessageEvent, createSilentLogger, platformId } from "../support/fixtures.js";

describe("MessageProjector", () => {
  let socketServer;
  let projector;

  beforeEach(() => {
    socketServer = { newMessage: mock.fn() };
    projector = new MessageProjector({ socketServer });
  });

  describe("defineHandlers", () => {
    let subscriptionRepository;

    beforeEach(() => {
      const logger = createSilentLogger();
      subscriptionRepository = new SubscriptionRepository(logger);
      projector.init(logger, subscriptionRepository);
      projector.defineHandlers();
    });

    it("binds to new 'create message' events emitted by BabiliEngine", () => {
      const routingKeys = subscriptionRepository.findAll().map((subscription) => subscription.query.toRoutingKey());

      assert.deepEqual(routingKeys, ["new.BabiliEngine.*.create message"]);
    });

    it("ignores events with another name, emitter or status", () => {
      for (const meta of [{ name: "update message" }, { emitter: "OtherEmitter" }, { status: "replayed" }]) {
        const event = createMessageEvent();
        Object.assign(event.meta, meta);

        assert.equal(subscriptionRepository.findSubscriptionsFor(new Event(event)).length, 0);
      }
    });

    it("pushes a matching event to the sender and every recipient", () => {
      const event = new Event(createMessageEvent());
      const [subscription] = subscriptionRepository.findSubscriptionsFor(event);

      subscription.process(event);

      const calls = socketServer.newMessage.mock.calls.map((call) => call.arguments.slice(0, 2));
      assert.deepEqual(calls, [["alice", platformId], ["bob", platformId], ["carol", platformId]]);
    });
  });

  describe("_convertToMessage", () => {
    it("maps the event changes, associations and metadata to a message", () => {
      const message = projector._convertToMessage(new Event(createMessageEvent()));

      assert.deepEqual(message, {
        id: 42,
        publicId: "message-public-id",
        content: "Hello Bob",
        roomId: 3,
        roomPublicId: "room-public-id",
        senderId: 7,
        senderPublicId: "alice",
        recipientPublicIds: ["bob", "carol"],
        contentType: "text",
        platformId,
        deviceSessionId: "sender-device-session",
        createdAt: "2026-10-03T10:15:30Z"
      });
    });

    it("defaults to no recipients and no sender when metadata is missing", () => {
      const event = createMessageEvent();
      delete event.data.userMetadata.recipientPublicIds;
      delete event.data.userMetadata.senderPublicId;

      const message = projector._convertToMessage(new Event(event));

      assert.deepEqual(message.recipientPublicIds, []);
      assert.equal(message.senderPublicId, null);
    });
  });

  describe("_sanitizeDate", () => {
    const cases = [
      ["2026-10-03 10:15:30 UTC", "2026-10-03T10:15:30Z"],
      ["2026-10-03 10:15:30.123 UTC", "2026-10-03T10:15:30.123Z"],
      ["2026-10-03T10:15:30Z", "2026-10-03T10:15:30Z"],
      ["2026-10-03", "2026-10-03"],
      [null, null],
      [undefined, null]
    ];

    for (const [input, expected] of cases) {
      it(`converts ${JSON.stringify(input)} to ${JSON.stringify(expected)}`, () => {
        assert.equal(projector._sanitizeDate(input), expected);
      });
    }
  });

  describe("_send", () => {
    it("only notifies recipients when the message has no sender", () => {
      projector._send({ senderPublicId: null, platformId, recipientPublicIds: ["bob"] }, socketServer);

      assert.deepEqual(socketServer.newMessage.mock.calls.map((call) => call.arguments[0]), ["bob"]);
    });

    it("passes the whole message to the socket server", () => {
      const message = { senderPublicId: "alice", platformId, recipientPublicIds: [] };

      projector._send(message, socketServer);

      assert.deepEqual(socketServer.newMessage.mock.calls[0].arguments, ["alice", platformId, message]);
    });
  });
});
