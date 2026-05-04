const winston = require("winston");
const cfg     = require("../config");

const logger = winston.createLogger({
  level: cfg.isDev ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    cfg.isDev
      ? winston.format.colorize()
      : winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const base = `[${timestamp}] ${level}: ${message}`;
      const extra = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
      return base + extra;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "./data/logs/error.log",  level: "error" }),
    new winston.transports.File({ filename: "./data/logs/combined.log" }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "./data/logs/exceptions.log" }),
  ],
});

module.exports = logger;
