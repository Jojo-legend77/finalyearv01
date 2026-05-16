const express = require("express");
const { authenticate, authenticateSse } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  listMyAlerts,
  getUnreadCount,
  markAlertRead,
  handleAlert,
  forwardAlert,
  streamAlerts,
} = require("../controllers/alertController");

const router = express.Router();

router.get("/stream", authenticateSse, streamAlerts);
router.use(authenticate, authorize("teacher", "parent"));
router.get("/", listMyAlerts);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markAlertRead);
router.patch("/:id/handle", handleAlert);
router.post("/:id/forward", forwardAlert);

module.exports = router;
