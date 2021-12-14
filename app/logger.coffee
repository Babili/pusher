winston     = require "winston"
environment = process.env.NODE_ENV || "development";

formatter   = winston.format.printf((log) ->
  levelName = log.level.toUpperCase().padEnd(5, " ")
  applicationName = "babili-pusher"
  thread = "main"
  context = ""
  userContext = ""
  "[#{log.timestamp}] [#{levelName}] [#{applicationName}] [#{environment}] [#{thread}] [#{context}] [#{userContext}] #{log.message}"
)

class Logger
  constructor: ->
    @logger = winston.createLogger
      name: "BabiliPusher"
      level: "debug"
      format: winston.format.combine(
        winston.format.timestamp()
        formatter
      )
      transports: [
        new winston.transports.Console({ level: "info" })
      ]
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




