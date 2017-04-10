Projector = require("happn").Projector

class MessageProjector extends Projector
  constructor: (@app) ->
    @socketServer = @app.socketServer

  name: ->
    "MessageProjector"

  defineHandlers: ->
    @on "BabiliEngine", "all", "create message", "new", (event) =>
      message = @_convertToMessage(event)
      @_send(message, @socketServer)

  _convertToMessage: (event) ->
      id                 : event.data.entityId
      publicId           : event.changeAfter("publicId")
      content            : event.changeAfter("content")
      roomId             : event.association("roomId")
      roomPublicId       : event.userMetadataFor("roomPublicId")
      senderId           : event.changeAfter("senderId")
      senderPublicId     : event.userMetadataFor("senderPublicId")
      recipientPublicIds : event.userMetadataFor("recipientPublicIds") || []
      contentType        : event.changeAfter("contentType")
      platformId         : event.userMetadataFor("platformId")
      deviceSessionId    : event.changeAfter("deviceSessionId")
      createdAt          : event.timestamp()

  _send: (message, socketServer) ->
    socketServer.newMessage message.senderPublicId, message.platformId, message if message.senderPublicId?
    for recipientPublicId in message.recipientPublicIds
      socketServer.newMessage recipientPublicId, message.platformId, message

module.exports = MessageProjector
