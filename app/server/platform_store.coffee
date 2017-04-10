request = require "request"

class PlatformStore
  constructor: (@app) ->
    @store  = {}
    @logger = @app.logger

  get: (id, callback) ->
    if @store[id]
      callback null, @store[id]
    else
      @_fetchPlatform id, (err, platform) =>
        return callback err if err
        attributes               = platform.data.attributes
        attributes.userRsaPublic = attributes.userRsaPublic
        @_add platform.data.id, attributes
        callback null, @store[id]

  _add: (id, attributes) ->
    @store[id] = attributes
    @logger.info "Platform #{id} added."

  _fetchPlatform: (platformId, callback) ->
    options  =
      url    : "http://#{@app.config.engine.host}:#{@app.config.engine.port}/internal/platforms/#{platformId}"
      method : "GET"
      json   : true

    request options, (err, response, body) ->
      return callback err if err

      if response.statusCode >= 500
        callback body
      else
        callback null, body

module.exports = PlatformStore

