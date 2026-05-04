const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimit");

router.post("/register", authLimiter, ctrl.register);
router.post("/login",    authLimiter, ctrl.login);
router.post("/logout",   ctrl.logout);
router.get("/me",        ctrl.me);

module.exports = router;
