const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getAssignedStudents,
  recordAttendance,
  recordGrade,
  recordBehavior,
  getTeacherRecentRecords,
} = require("../controllers/teacherController");

const router = express.Router();

router.use(authenticate, authorize("teacher", "admin"));
router.get("/students", getAssignedStudents);
router.post("/attendance", recordAttendance);
router.post("/grades", recordGrade);
router.post("/behavior", recordBehavior);
router.get("/records/recent", getTeacherRecentRecords);

module.exports = router;
