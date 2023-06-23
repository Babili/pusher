import happn from "happn";
const { Projector } = happn;

export class MessageProjector extends Projector {
  constructor(app) {
    super();
    this.app = app;
    this.socketServer = app.socketServer;
  }

  name() {
    return "MessageProjector";
  }

  defineHandlers() {
    this.on("BabiliEngine", "all", "create message", "new", (event) => {
      const message = this._convertToMessage(event);
      this._send(message, this.socketServer);
    });
  }

  _convertToMessage(event) {
    return {
      id: event.data.entityId,
      publicId: event.changeAfter("publicId"),
      content: event.changeAfter("content"),
      roomId: event.association("roomId"),
      roomPublicId: event.userMetadataFor("roomPublicId"),
      senderId: event.changeAfter("senderId"),
      senderPublicId: event.userMetadataFor("senderPublicId"),
      recipientPublicIds: event.userMetadataFor("recipientPublicIds") || [],
      contentType: event.changeAfter("contentType"),
      platformId: event.userMetadataFor("platformId"),
      deviceSessionId: event.changeAfter("deviceSessionId"),
      createdAt: this._sanitizeDate(event.timestamp())
    };
  }

  _sanitizeDate(date) {
    if (date) {
      var sanitizedDate = date;
      if (sanitizedDate.endsWith(" UTC")) {
        sanitizedDate = sanitizedDate.replace(" UTC", "Z");
      }
      const indexBetweenDateAndTime = 10;
      if (sanitizedDate.length > indexBetweenDateAndTime && sanitizedDate.charAt(indexBetweenDateAndTime) === " ") {
        sanitizedDate = sanitizedDate.substring(0, indexBetweenDateAndTime) + "T" + sanitizedDate.substring(indexBetweenDateAndTime + 1);
      }
      return sanitizedDate;
    } else {
      return null;
    }
  }

  _send(message, socketServer) {
    if (message.senderPublicId) {
      socketServer.newMessage(message.senderPublicId, message.platformId, message);
    }
    for (const recipientPublicId of message.recipientPublicIds) {
      socketServer.newMessage(recipientPublicId, message.platformId, message);
    }
  }
}
