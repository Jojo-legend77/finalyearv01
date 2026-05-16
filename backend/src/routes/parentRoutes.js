const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getMyStudents,
  getStudentDetails,
  getChildSummary,
} = require("../controllers/parentController");

const router = express.Router();

router.use(authenticate, authorize("parent", "admin"));
router.get("/students", getMyStudents);
router.get("/students/:studentId", getStudentDetails);
router.get("/students/:studentId/summary", getChildSummary);

module.exports = router;
