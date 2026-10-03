import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { App } from "../../app/app.js";

describe("App", () => {
  let app;
  let signalListeners;

  beforeEach(() => {
    const listenersBefore = { SIGINT: process.listeners("SIGINT"), SIGTERM: process.listeners("SIGTERM") };
    app = new App({ redis: { url: "redis://localhost:6379" }, engine: {}, authentication: {} });
    app.logger.logger.silent = true;
    app.socketServer.stop = mock.fn();
    signalListeners = Object.fromEntries(Object.entries(listenersBefore).map(([signal, before]) => {
      const added = process.listeners(signal).find((listener) => !before.includes(listener));
      process.removeListener(signal, added);
      return [signal, added];
    }));
    mock.method(process, "exit", () => {});
  });

  afterEach(() => mock.restoreAll());

  for (const signal of ["SIGINT", "SIGTERM"]) {
    it(`stops the socket server and exits on ${signal}`, () => {
      signalListeners[signal]();

      assert.equal(app.socketServer.stop.mock.callCount(), 1);
      assert.equal(process.exit.mock.callCount(), 1);
    });
  }
});
