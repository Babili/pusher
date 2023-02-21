import * as Sentry from "@sentry/node";
import { App } from "./app/app.js";
import { configuration } from "./config/config.js";

const start = async() => {
  const env = process.env.NODE_ENV || "development";
  const app = new App(configuration);

  if (configuration.sentryDsn) {
    Sentry.init({
      dsn: configuration.sentryDsn,
      environment: env
    });
  }

  await app.start();
};

start();
