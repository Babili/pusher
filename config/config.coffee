# defaultConfiguration =
#   port: "9090"
#   engine:
#     host: "localhost"
#     port: 8889
#   sentryDsn: "https://98764cfb8bbc44cc9ed6aca1eb3bafcf@sentry.commuty.net/3"
#   headers:
#     hstsHeader: "max-age=63072000; includeSubDomains" || null
#   redis:
#     url: "redis://localhost:9889/8"

defaultConfiguration =
  port: process.env.PORT
  engine:
    host: process.env.ENGINE_HOST
    port: process.env.ENGINE_PORT
  sentryDsn: process.env.SENTRY_DSN
  headers:
    hstsHeader: process.env.HSTS_HEADER || null
  redis:
    url: process.env.REDIS_URL

module.exports =
  development: defaultConfiguration
  qa: defaultConfiguration
  production: defaultConfiguration
