const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  listUsers,
  createUser,
  createStudent,
  listSchoolStructure,
  createGradeLevel,
  createSection,
  createCourse,
  assignCourseToGrade,
  assignTeacherToSectionCourse,
  assignParentToStudent,
  assignTeacherToStudent,
  listStudents,
  listSystemSettings,
  upsertSystemSetting,
  updateRiskThreshold,
  uploadTrainingCsv,
  trainModelFromCsv,
} = require("../controllers/adminController");

const router = express.Router();
const trainingUploadDir = path.join(process.cwd(), "uploads", "ai-training");
fs.mkdirSync(trainingUploadDir, { recursive: true });
const upload = multer({ dest: trainingUploadDir });

router.use(authenticate, authorize("admin"));

router.get("/users", listUsers);
router.post("/users", createUser);
router.get("/students", listStudents);
router.post("/students", createStudent);
router.get("/structure", listSchoolStructure);
router.post("/grades", createGradeLevel);
router.post("/sections", createSection);
router.post("/courses", createCourse);
router.post("/grades/courses", assignCourseToGrade);
router.post("/teacher-assignments", assignTeacherToSectionCourse);
router.post("/students/assign-parent", assignParentToStudent);
router.post("/students/assign-teacher", assignTeacherToStudent);
router.get("/settings", listSystemSettings);
router.post("/settings", upsertSystemSetting);
router.post("/ai/risk-threshold", updateRiskThreshold);
router.post("/ai/training-csv", upload.single("file"), uploadTrainingCsv);
router.post("/ai/train", trainModelFromCsv);

module.exports = router;
