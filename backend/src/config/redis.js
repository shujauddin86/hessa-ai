const IORedis = require("ioredis");
const cfg     = require("./index");
const logger  = require("../utils/logger");

let client = null;

function getRedis() {
  if (client) return client;
  client = new IORedis({
    host:            cfg.redis.host,
    port:            cfg.redis.port,
    password:        cfg.redis.password,
    maxRetriesPerRequest: null,   // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });
  client.on("connect",  () => logger.info("[Redis] Connected"));
  client.on("error",    (e) => logger.error("[Redis] Error", { err: e.message }));
  client.on("reconnecting", () => logger.warn("[Redis] Reconnecting..."));
  return client;
}

module.exports = { getRedis };
