import jwt from "jsonwebtoken";

import { Server } from "socket.io";
import { authorize } from "socketio-jwt";
import { v4 as uuidv4 } from "uuid";
import { PlatformStore } from "./platform_store.js";
import { SocketStore } from "./socket_store.js";

export class SocketServer {
  constructor(app) {
    this.app = app;
    this.logger = app.logger;
    this.socketStore = new SocketStore(app);
    this.platformStore = new PlatformStore(app);
  }

  async authorization(handshakeData, callback) {
    const jwtToken = handshakeData.handshake.query.token;
    const decodedJwtToken = jwt.decode(jwtToken);
    if (decodedJwtToken?.data?.platformId) {
      const platformAttributes = await this.platformStore.get(decodedJwtToken.data.platformId);
      return authorize({
        secret: platformAttributes.userRsaPublic,
        timeout: 15000,
        handshake: true
      })(handshakeData, callback);
    } else {
      return callback(null, false);
    }
  }

  async connect() {
    return await this.socketStore.connect();
  }

  start() {
    this.io = new Server();
    this.io.use((socket, next) => this.authorization(socket, next));

    this.io.sockets.on("connection", (socket) => this._handleSocketConnection(socket));

    this.io.listen(this.app.config.port);
  }

  async _handleSocketConnection(socket) {
    const userId = socket.decoded_token.sub;
    const platformId = socket.decoded_token.data.platformId;
    socket.deviceSessionId = uuidv4();
    await this.socketStore.add(userId, platformId, socket);
    this.logger.info(`User <${userId}> just logged in`);
    socket.emit("connected", { deviceSessionId: socket.deviceSessionId });
    socket.on("ping", () => socket.emit("pong", {}));
    socket.on("disconnect", () => this._handleDisconnection(userId, platformId, socket));

    if (this.app.config?.headers?.hstsHeader) {
      this.io.engine.on("headers", (headers) => {
        headers["Strict-Transport-Security"] = this.app.config.headers.hstsHeader;
      });
    }
  }

  async _handleDisconnection(userId, platformId, socket) {
    await this.socketStore.remove(userId, platformId, socket);
    this.logger.info(`User <${userId}> just logged out`);
  }

  stop() {
    this.io.close();
    this.logger.info("Socket listener stopped.");
  }

  _waitAndSendNewMessage(recipientPublicId, platformId, deviceSessionId, messageView, retry = 0) {
    const sockets = this.socketStore.get(recipientPublicId, platformId);
    if (sockets?.length > 0) {
      this.logger.debug(`Sending message to ${recipientPublicId}.`);
      this.logger.debug(messageView);
      for (const socket of sockets) {
        if (socket.deviceSessionId !== deviceSessionId) {
          socket.emit("new message", messageView);
        }
      }
    } else if (retry < 10) {
      this.logger.debug(`Recipient ${recipientPublicId} was present (or didn't logout gracefully) but socket is not found. Wait reconnection and retry in 2 second...`);
      setTimeout(() => {
        this._waitAndSendNewMessage(recipientPublicId, platformId, deviceSessionId, messageView, retry + 1);
      }, 2000);
    }
  }

  _buildMessageView(message) {
    const view = {
      data: {
        id: message.publicId,
        attributes: {
          content: message.content,
          contentType: message.contentType,
          createdAt: message.createdAt
        },
        relationships: {
          room: {
            data: {
              type: "room",
              id: message.roomPublicId
            }
          }
        }
      }
    };

    if (message.senderPublicId) {
      view.data.relationships.sender = {
        data: {
          type: "user",
          id: message.senderPublicId
        }
      };
    }
    return view;
  }

  async newMessage(recipientPublicId, platformId, message) {
    const isPresent = await this.socketStore.isPresent(recipientPublicId, platformId);
    if (isPresent) {
      const messageView = this._buildMessageView(message);
      this._waitAndSendNewMessage(recipientPublicId, platformId, message.deviceSessionId, messageView);
      this.logger.debug(`Recipient ${recipientPublicId} present, wait and send message.`);
    }
  }
}
