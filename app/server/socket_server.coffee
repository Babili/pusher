IO            = require "socket.io"
SocketStore   = require "./socket_store"
socketioJwt   = require "socketio-jwt"
PlatformStore = require "./platform_store"
jwt           = require "jsonwebtoken"
uuid          = require "uuid"
request       = require "request"

class SocketServer
  constructor: (@app) ->
    @logger        = @app.logger
    @socketStore   = new SocketStore @app
    @platformStore = new PlatformStore @app

  authorization: (handshakeData, callback) =>
    jwtToken        = handshakeData.handshake.query.token
    decodedJwtToken = jwt.decode jwtToken
    if decodedJwtToken and decodedJwtToken.data.platformId
      @platformStore.get decodedJwtToken.data.platformId, (err, platformAttributes) =>
        return callback err if err
        socketioJwt.authorize(
          secret    : platformAttributes.userRsaPublic
          timeout   : 15000
          handshake : true
        ) handshakeData, callback
    else
      callback null, false

  start: (callback) ->
    @io = IO()
    @io.use @authorization

    @io.sockets.on "connection", (socket) =>
      userId     = socket.decoded_token.sub
      platformId = socket.decoded_token.data.platformId
      socket.deviceSessionId = uuid.v4()
      @socketStore.add userId, platformId, socket, (err) =>
        return callback err if err
        @logger.info "User <#{userId}> just logged in"
        socket.emit "connected", deviceSessionId: socket.deviceSessionId

      socket.on "ping", ->
        socket.emit "pong", {}

      socket.on "disconnect", =>
        @socketStore.remove userId, platformId, socket, (err) =>
          @logger.info "User <#{userId}> just logged out"

    @io.listen(@app.config.port)

    callback null

  stop: (callback) ->
    @io.close()
    @logger.info "Socket listener stopped."
    callback null

  _waitAndSendNewMessage: (recipientPublicId, platformId, deviceSessionId, messageView, retry=0) ->
    @socketStore.get recipientPublicId, platformId, (err, sockets) =>
      throw err if err?
      if sockets? && sockets.length > 0
        @logger.debug "Sending message to #{recipientPublicId}."
        @logger.debug messageView
        for socket in sockets
          if socket.deviceSessionId isnt deviceSessionId
            socket.emit "new message", messageView
      else
        if retry < 10
          @logger.debug "Recipient #{recipientPublicId} was present (or didn't logout gracefully) but socket is not found. Wait reconnection and retry in 2 second..."
          setTimeout =>
            @_waitAndSendNewMessage(recipientPublicId, platformId, deviceSessionId, messageView, retry + 1)
          , 2000

  _buildMessageView: (message, callback) ->
    view =
      data:
        id: message.publicId
        attributes:
          content     : message.content
          contentType : message.contentType
          createdAt   : message.createdAt
        relationships:
          room:
            data:
              type : "room"
              id   : message.roomPublicId

    if message.senderPublicId?
      view.data.relationships.sender =
        data:
          type : "user"
          id   : message.senderPublicId
    callback null, view, message.deviceSessionId

  newMessage: (recipientPublicId, platformId, message) ->
    @socketStore.isPresent recipientPublicId, platformId, (err, isPresent) =>
      @_buildMessageView message, (err, messageView, deviceSessionId) =>
        throw err if err?
        if isPresent
          @_waitAndSendNewMessage recipientPublicId, platformId, deviceSessionId, messageView
          @logger.debug "Recipient #{recipientPublicId} present, wait and send message."

module.exports = SocketServer
