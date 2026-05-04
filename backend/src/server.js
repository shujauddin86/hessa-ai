/**
 * server.js — HTTP server entry point
 * Run: node src/server.js
 * Worker: node src/queue/worker.js (separate process)
 */
require("dotenv").config();

const http   = require("http");
const app    = require("./app");
const cfg    = require("./config");
const logger = require("./utils/logger");
const db     = require("./models/database");

const PORT = cfg.port || 4000;

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`[Server] Hessa AI backend running on port ${PORT}`, {
    env:  process.env.NODE_ENV || "development",
    port: PORT,
  });
});

server.on("error", (err) => {
  logger.error("[Server] Fatal error", { err: err.message });
  process.exit(1);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`[Server] Received ${signal}, shutting down gracefully`);
  server.close(() => {
    db.close();
    logger.info("[Server] Closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // force-kill after 10s
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("uncaughtException",  (err) => logger.error("[Server] Uncaught exception",  { err: err.message, stack: err.stack }));
process.on("unhandledRejection", (err) => logger.error("[Server] Unhandled rejection", { err: String(err) }));

module.exports = server;
