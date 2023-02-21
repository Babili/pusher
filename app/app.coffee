SocketServer     = require "./server/socket_server"
Logger           = require "./logger"
Happn            = require("happn").Happn
MessageProjector = require "./server/message_projector"

class App
  constructor: (@config) ->
    @logger           = new Logger
    @socketServer     = new SocketServer @
    @happn            = new Happn @logger
    @messageProjector = new MessageProjector @
    process.once "SIGINT", @stop
    process.once "SIGTERM", @stop

  start: (callback) ->
    self = @
    await @socketServer.connect()
    @socketServer.start (err) =>
      throw err if err?
      @happn.init([@messageProjector])
      @happn.start().then ->
        self.logger.info("Pusher started.");
        callback null

  stop: =>
    @logger.info "Stopping pusher..."
    @socketServer.stop (err) =>
      throw err if err?
      process.exit()

module.exports = App

