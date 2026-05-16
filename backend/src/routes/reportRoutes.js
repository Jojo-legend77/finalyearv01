const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getStudentReport,
  getSystemSummary,
  getClassSummary,
  getMySummary,
  getSchoolReport,
} = require("../controllers/reportController");

const router = express.Router();

router.use(authenticate);

router.get("/my-summary", authorize("parent", "teacher", "admin"), getMySummary);
router.get("/summary/system", authorize("admin"), getSystemSummary);
router.get("/summary/class/:className", authorize("teacher", "admin"), getClassSummary);
router.get("/summary/school", authorize("school_director"), getSchoolReport);
router.get("/student/:studentId", authorize("parent", "teacher", "admin"), getStudentReport);

module.exports = router;
