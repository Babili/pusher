defaultConfiguration =
  port: process.env.PORT
  engine:
    host: process.env.ENGINE_HOST
    port: process.env.ENGINE_PORT
  sentryDsn: process.env.SENTRY_DSN
  redis:
    url: process.env.REDIS_URL

module.exports =
  development: defaultConfiguration
  production: defaultConfiguration
