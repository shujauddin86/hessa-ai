const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const KEY  = crypto.scryptSync(
  process.env.JWT_SECRET || "dev_secret_hessa_ai",
  "hessa_salt_v1",
  32
);

function encrypt(text) {
  const iv         = crypto.randomBytes(12);
  const cipher     = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag        = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(data) {
  const [ivHex, tagHex, encHex] = data.split(":");
  const iv        = Buffer.from(ivHex,  "hex");
  const tag       = Buffer.from(tagHex, "hex");
  const enc       = Buffer.from(encHex, "hex");
  const decipher  = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function hmac(data, secret = "hessa_hmac") {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = { encrypt, decrypt, hmac, randomToken };
