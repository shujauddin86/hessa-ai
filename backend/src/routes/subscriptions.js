const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/subscriptionController");
const { requireAuth } = require("../middleware/auth");

router.get("/",           requireAuth, ctrl.getSubscription);
router.post("/pay",       requireAuth, ctrl.initPayment);
router.post("/confirm",   requireAuth, ctrl.confirmPayment);

module.exports = router;
