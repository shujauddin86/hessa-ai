const jwt    = require("jsonwebtoken");
const cfg    = require("../config");
const logger = require("./logger");

function sign(payload) {
  return jwt.sign(payload, cfg.jwt.secret, { expiresIn: cfg.jwt.expiresIn });
}

function verify(token) {
  try {
    return jwt.verify(token, cfg.jwt.secret);
  } catch (err) {
    logger.warn("[JWT] verify failed", { err: err.message });
    return null;
  }
}

function decode(token) {
  try { return jwt.decode(token); } catch { return null; }
}

module.exports = { sign, verify, decode };
