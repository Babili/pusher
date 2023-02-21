import { format, createLogger, transports } from "winston";

const environment = process.env.NODE_ENV || "development";
const formatter = format.printf(log => {
  const levelName = log.level.toUpperCase().padEnd(5, " ");
  const applicationName = "babili-pusher";
  const thread = "main";
  const context = "";
  const userContext = "";
  return `[${log.timestamp}] [${levelName}] [${applicationName}] [${environment}] [${thread}] [${context}] [${userContext}] ${log.message}`;
});

export class Logger {
  constructor() {
    this.logger = createLogger({
      name: "BabiliPusher",
      level: "debug",
      format: format.combine(
        format.timestamp(),
        formatter
      ),
      transports: [
        new transports.Console({ level: "info" })
      ]
    });
  }

  debug(message) {
    this.logger.debug(message);
  }

  err(message) {
    this.logger.error(message);
  }

  info(message) {
    this.logger.info(message);
  }

  warn(message) {
    this.logger.warn(message);
  }
}
