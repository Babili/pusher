bunyan  = require "bunyan"
devnull = require "devnull"

class Logger
  constructor: ->
    if process.env.NODE_ENV == "development"
      @logger = new devnull
        timestamp: false
        namespacing: 0
    else
      @logger = bunyan.createLogger
        name: "BabiliPusher"
        level: "debug"
    this

  debug: (message) ->
    @logger.debug message

  err: (message) ->
    @logger.error message

  info: (message) ->
    @logger.info message

  warn: (message) ->
    if process.env.NODE_ENV == "development"
      @logger.warning message
    else
      @logger.warn message

module.exports = Logger




