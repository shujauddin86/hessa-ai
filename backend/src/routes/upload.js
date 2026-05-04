const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const cfg      = require("../config");
const ctrl     = require("../controllers/uploadController");
const { requireAuth } = require("../middleware/auth");
const { uploadLimiter } = require("../middleware/rateLimit");

// Multer for chunks — store in temp dir, no limits on chunk size
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cfg.paths.uploads),
  filename:    (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const chunkUpload = multer({ storage: chunkStorage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB per chunk

// Face reference upload
const faceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cfg.paths.uploads),
  filename:    (req, file, cb) => cb(null, `face_${Date.now()}${path.extname(file.originalname)}`),
});
const faceUpload = multer({
  storage: faceStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed for face reference"));
    cb(null, true);
  },
});

router.post("/chunk",     requireAuth, uploadLimiter, chunkUpload.single("chunk"), ctrl.uploadChunk);
router.post("/face",      requireAuth, uploadLimiter, faceUpload.single("face"),   ctrl.uploadFaceReference);

module.exports = router;
