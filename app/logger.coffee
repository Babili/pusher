winston  = require "winston"

class Logger
  constructor: ->
    @logger = winston.createLogger
      name: "BabiliPusher"
      level: "debug"

    if process.env.NODE_ENV == "development"
      @logger.add new winston.transports.Console
        format: winston.format.simple()

    this

  debug: (message) ->
    @logger.debug message

  err: (message) ->
    @logger.error message

  info: (message) ->
    @logger.info message

  warn: (message) ->
    @logger.warn message

module.exports = Logger




