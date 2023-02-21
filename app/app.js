import { Happn } from "happn";
import { Logger } from "./logger.js";
import { MessageProjector } from "./server/message_projector.js";
import { SocketServer } from "./server/socket_server.js";

export class App {
  constructor(config) {
    this.config = config;
    this.logger = new Logger();
    this.socketServer = new SocketServer(this);
    this.happn = new Happn(this.logger);
    this.messageProjector = new MessageProjector(this);
    process.once("SIGINT", this.stop);
    process.once("SIGTERM", this.stop);
  }

  async start() {
    const self = this;
    await this.socketServer.connect();
    await this.socketServer.start();
    this.happn.init([this.messageProjector]);
    await this.happn.start();
    self.logger.info("Pusher started.");
  }

  stop() {
    this.logger.info("Stopping pusher...");
    this.socketServer.stop();
    process.exit();
  }
}
