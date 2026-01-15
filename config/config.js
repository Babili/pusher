export const configuration = {
  port: process.env.PORT,
  engine: {
    host: process.env.ENGINE_HOST,
    port: process.env.ENGINE_PORT
  },
  sentryDsn: process.env.SENTRY_DSN,
  headers: {
    hstsHeader: process.env.HSTS_HEADER || null
  },
  redis: {
    url: process.env.REDIS_URL
  },
  authentication: {
    jwtAudience: process.env.JWT_AUDIENCE,
    jwtAlgorithms: (process.env.JWT_ALGORITHMS && process.env.JWT_ALGORITHMS.split(",")) || ["RS256"]
  }
};
