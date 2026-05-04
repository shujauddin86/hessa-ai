const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/jobController");
const { requireAuth } = require("../middleware/auth");

router.get("/",                    requireAuth, ctrl.listJobs);
router.get("/:id",                 requireAuth, ctrl.getJob);
router.post("/:id/select-clips",   requireAuth, ctrl.selectClips);
router.post("/:id/regenerate",     requireAuth, ctrl.regenerate);
router.get("/:id/download-link",   requireAuth, ctrl.getDownloadLink);
router.get("/:id/stream-progress", requireAuth, ctrl.streamProgress);

// Public download (HMAC-signed, one-time)
router.get("/download/:token", ctrl.serveDownload);

module.exports = router;
