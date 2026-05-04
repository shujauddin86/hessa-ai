/**
 * config/index.js — Centralised configuration
 * All env access flows through here — never directly in app code.
 */
require("dotenv").config();
const path = require("path");

const cfg = {
  env:         process.env.NODE_ENV || "development",
  port:        parseInt(process.env.PORT || "4000", 10),
  isDev:       process.env.NODE_ENV !== "production",

  jwt: {
    secret:     process.env.JWT_SECRET || "dev_secret_change_in_prod",
    expiresIn:  process.env.JWT_EXPIRES_IN || "30d",
  },

  redis: {
    host:       process.env.REDIS_HOST || "127.0.0.1",
    port:       parseInt(process.env.REDIS_PORT || "6379", 10),
    password:   process.env.REDIS_PASSWORD || undefined,
  },

  db: {
    path:       path.resolve(process.env.DB_PATH || "./data/hessa.db"),
  },

  storage: {
    uploadDir:  path.resolve(process.env.UPLOAD_DIR  || "./data/uploads"),
    outputDir:  path.resolve(process.env.OUTPUT_DIR  || "./data/outputs"),
    tempDir:    path.resolve(process.env.TEMP_DIR    || "./data/temp"),
    maxFileMB:  parseInt(process.env.MAX_FILE_SIZE_MB || "2000", 10),
    chunkMB:    parseInt(process.env.CHUNK_SIZE_MB   || "10",   10),
  },

  autoDelete: {
    minutes:    parseInt(process.env.AUTO_DELETE_MINUTES || "10", 10),
  },

  ffmpeg: {
    path:       process.env.FFMPEG_PATH   || "ffmpeg",
    probe:      process.env.FFPROBE_PATH  || "ffprobe",
  },

  gpu: {
    enabled:    process.env.GPU_ENABLED === "true",
    device:     process.env.NVIDIA_VISIBLE_DEVICES || "0",
  },

  security: {
    csrfSecret: process.env.CSRF_SECRET || "dev_csrf_secret",
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    rateLimitMax:      parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    fraudMaxFailed:    parseInt(process.env.FRAUD_MAX_FAILED_LOGINS || "5", 10),
    fraudLockoutMs:    parseInt(process.env.FRAUD_LOCKOUT_MS || "900000", 10),
  },

  cdn: {
    baseUrl:    process.env.CDN_BASE_URL || "http://localhost:4000",
    linkTTL:    parseInt(process.env.DOWNLOAD_LINK_TTL_SECONDS || "300", 10),
  },

  analytics: {
    batchSize:  parseInt(process.env.ANALYTICS_BATCH_SIZE || "50", 10),
    flushMs:    parseInt(process.env.ANALYTICS_FLUSH_MS   || "10000", 10),
  },

  subscription: {
    priceINR:       parseInt(process.env.PAY_PER_USE_PRICE_INR || "99", 10),
    razorpayKey:    process.env.RAZORPAY_KEY_ID     || "mock_key",
    razorpaySecret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
  },

  // ── AWS Rekognition ──────────────────────────────────────────────────────
  aws: {
    region:          process.env.AWS_REGION           || "us-east-1",
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID    || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    rekognitionCollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID || "hessa-faces",
  },

  // ── Face Detection ───────────────────────────────────────────────────────
  face: {
    similarityThreshold: parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || "90"),
    useAWS: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
  },

  // ── LUT Color Grading ────────────────────────────────────────────────────
  lut: {
    dir:       path.resolve(__dirname, "../../assets/luts"),
    vivid:     process.env.LUT_VIVID      || "cinematic_vivid.cube",
    muted:     process.env.LUT_MUTED      || "cinematic_muted.cube",
    cinematic: process.env.LUT_CINEMATIC  || "cinematic_teal_orange.cube",
    dark:      process.env.LUT_DARK       || "cinematic_dark.cube",
    warm:      process.env.LUT_WARM       || "cinematic_warm.cube",
  },
};

// Convenience alias so existing code using cfg.paths still works
cfg.paths = {
  uploads: cfg.storage.uploadDir,
  jobs:    cfg.storage.outputDir,
  temp:    cfg.storage.tempDir,
};

module.exports = cfg;
