const express = require("express");
const { authenticate, authenticateSse } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  listMyNotifications,
  markNotificationRead,
  streamNotifications,
  createAnnouncement,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/stream", authenticateSse, streamNotifications);
router.use(authenticate);
router.get("/", listMyNotifications);
router.patch("/:id/read", markNotificationRead);
router.post("/announcements", authorize("school_director"), createAnnouncement);

module.exports = router;
