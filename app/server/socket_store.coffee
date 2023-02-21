redis = require "redis"

class SocketStore
  constructor: (@app) ->
    @redisPresenceStore = redis.createClient
      url: @app.config.redis.url
    @store              = {}
  
  connect: ->
    @redisPresenceStore.connect()

  key: (userId, platformId) ->
    "#{userId}_#{platformId}"

  add: (userId, platformId, socket, callback) ->
    @redisPresenceStore.set @key(userId, platformId), new Date().toISOString(), (err, reply) =>
      throw err if err?
      @store[@key(userId, platformId)] = @store[@key(userId, platformId)] || []
      @store[@key(userId, platformId)].push(socket)
      callback null

  get: (userId, platformId, callback) ->
    callback null, @store[@key(userId, platformId)]

  isPresent: (userId, platformId, callback) ->
    @redisPresenceStore.exists @key(userId, platformId), (err, reply) ->
      throw err if err?
      callback null, reply > 0

  remove: (userId, platformId, socket, callback) ->
    userSockets = @store[@key(userId, platformId)]
    if userSockets && userSockets.length > 1
      index = userSockets.indexOf(socket)
      userSockets.splice(index, 1)
      callback null if callback
    else
      @redisPresenceStore.del @key(userId, platformId), (err, reply) =>
        throw err if err?
        delete @store[@key(userId, platformId)]
        callback null if callback

module.exports = SocketStore
