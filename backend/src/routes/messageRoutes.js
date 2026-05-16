const express = require("express");
const { authenticate, authenticateSse } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  listThreads,
  listThreadMessages,
  sendMessage,
  streamMessages,
  listContacts,
  markThreadRead,
  unreadCount,
} = require("../controllers/messageController");

const router = express.Router();

router.get("/stream", authenticateSse, streamMessages);
router.use(authenticate, authorize("parent", "teacher", "admin"));
router.get("/threads", listThreads);
router.get("/contacts", listContacts);
router.get("/unread-count", unreadCount);
router.get("/threads/:threadId", listThreadMessages);
router.post("/threads/:threadId/read", markThreadRead);
router.post("/send", sendMessage);

module.exports = router;
