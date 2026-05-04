const express = require("express");
const router  = express.Router();
const engine  = require("../privacy/engine");
const { requireAuth } = require("../middleware/auth");

// Analyze a clip for platform violations
router.post("/analyze", requireAuth, async (req, res, next) => {
  try {
    const { clipUrl, platforms } = req.body;
    if (!clipUrl) return res.status(400).json({ error: "clipUrl required" });

    const result = await engine.analyze(clipUrl, platforms || ["youtube", "instagram", "tiktok"]);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Generate takedown/dispute request
router.post("/request", requireAuth, async (req, res, next) => {
  try {
    const { platform, videoId, reason } = req.body;
    if (!platform || !videoId) return res.status(400).json({ error: "platform and videoId required" });

    const request = await engine.generateRequest(platform, videoId, reason);
    res.json(request);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
