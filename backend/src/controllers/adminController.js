const axios = require("axios");
const bcrypt = require("bcryptjs");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const env = require("../config/env");
const {
  User,
  Student,
  GradeLevel,
  SchoolSection,
  Course,
  GradeCourse,
  TeacherAssignment,
  ParentStudent,
  TeacherStudent,
  SystemSetting,
  Notification,
} = require("../models");
const { ok, created, fail } = require("../utils/response");
const { notifyUser } = require("../services/notificationService");
const { SECURITY_SETUP_NOTIFICATION_KIND } = require("../constants/securityQuestions");

const AI_SETTINGS = {
  threshold: "ai_risk_threshold",
  trainingCsv: "ai_training_csv",
};

const trainingUploadDir = path.join(process.cwd(), "uploads", "ai-training");
fsSync.mkdirSync(trainingUploadDir, { recursive: true });

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseCsv = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^"|"$/g, ""));
  const rows = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    if (!values.length) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").replace(/^"|"$/g, "");
    });
    rows.push(row);
  }

  return rows;
};

const coerceNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getSetting = async (key) => SystemSetting.findOne({ where: { key } });

const upsertSetting = async (key, value, description = null) => {
  await SystemSetting.upsert({ key, value: String(value), description });
  return getSetting(key);
};

const syncRiskThreshold = async (threshold) => {
  try {
    await axios.post(
      `${env.aiServiceUrl}/threshold`,
      { threshold },
      { timeout: 10000 },
    );
  } catch (error) {
    console.warn("Failed to sync AI threshold:", error.message);
  }
};

const buildTrainingRecordsFromCsv = (csvText) => {
  const rows = parseCsv(csvText);
  return rows
    .map((row, index) => ({
      studentId: coerceNumber(row.studentId ?? row.id ?? index + 1, index + 1),
      studentName: String(row.studentName ?? row.name ?? `Student ${index + 1}`),
      attendanceRate: coerceNumber(row.attendanceRate ?? row.attendance_rate, 0.85),
      avgGradePercent: coerceNumber(row.avgGradePercent ?? row.avg_grade_percent, 0),
      behaviorRiskScore: coerceNumber(row.behaviorRiskScore ?? row.behavior_risk_score, 0),
      attendanceCount: coerceNumber(row.attendanceCount ?? row.attendance_count, 0),
      gradeCount: coerceNumber(row.gradeCount ?? row.grade_count, 0),
      behaviorCount: coerceNumber(row.behaviorCount ?? row.behavior_count, 0),
    }))
    .filter((record) => Number.isFinite(record.studentId) && record.studentName);
};

const listUsers = async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["passwordHash"] },
      order: [["createdAt", "DESC"]],
    });
    return ok(res, users, "Users fetched");
  } catch (error) {
    return fail(res, "Failed to fetch users", 500, error.message);
  }
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, studentIds = [], newStudent = null } = req.body;
    if (!fullName || !email || !password || !role) {
      return fail(res, "fullName, email, password and role are required", 400);
    }

    if (!["parent", "teacher", "admin", "school_director"].includes(role)) {
      return fail(res, "Invalid role", 400);
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return fail(res, "Email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash, role, status: "active" });

    if (["parent", "teacher"].includes(role)) {
      await notifyUser(
        user.id,
        "system",
        "Set your security question",
        "Please set a security question and answer in Notifications to enable future password reset.",
        { kind: SECURITY_SETUP_NOTIFICATION_KIND },
      );
    }

    if (role === "parent") {
      const hasStudentIds = Array.isArray(studentIds) && studentIds.length > 0;
      const hasNewStudent =
        newStudent && newStudent.firstName && newStudent.lastName && (newStudent.sectionId || newStudent.className);
      if (!hasStudentIds && !hasNewStudent) {
        return fail(res, "At least one child must be assigned to a parent", 400);
      }

      if (hasStudentIds) {
        const existingStudents = await Student.findAll({ where: { id: studentIds } });
        await Promise.all(
          existingStudents.map((student) =>
            ParentStudent.findOrCreate({ where: { parentId: user.id, studentId: student.id } }),
          ),
        );
      }

      if (hasNewStudent) {
        let sectionId = newStudent.sectionId || null;
        let className = newStudent.className || null;
        let sectionLabel = newStudent.section || null;

        if (sectionId) {
          const section = await SchoolSection.findByPk(sectionId, {
            include: [{ model: GradeLevel, as: "gradeLevel" }],
          });
          if (!section) {
            return fail(res, "Selected child section not found", 404);
          }
          className = section.gradeLevel?.name || className || "Unassigned";
          sectionLabel = section.name;
        }

        const createdStudent = await Student.create({
          firstName: newStudent.firstName,
          lastName: newStudent.lastName,
          className: className || "Unassigned",
          section: sectionLabel,
          sectionId,
          dateOfBirth: newStudent.dateOfBirth || null,
        });
        await ParentStudent.findOrCreate({ where: { parentId: user.id, studentId: createdStudent.id } });
      }
    }
    return created(
      res,
      {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      "User created",
    );
  } catch (error) {
    return fail(res, "Failed to create user", 500, error.message);
  }
};

const createStudent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      sectionId,
      parentIds = [],
      teacherIds = [],
    } = req.body;

    if (!firstName || !lastName || !sectionId) {
      return fail(res, "firstName, lastName and sectionId are required", 400);
    }

    const section = await SchoolSection.findByPk(sectionId, {
      include: [{ model: GradeLevel, as: "gradeLevel" }],
    });
    if (!section) {
      return fail(res, "Selected section not found", 404);
    }

    const student = await Student.create({
      firstName,
      lastName,
      className: section.gradeLevel?.name || "Unassigned",
      dateOfBirth: dateOfBirth || null,
      section: section.name,
      sectionId: section.id,
    });

    if (Array.isArray(parentIds) && parentIds.length > 0) {
      const parentUsers = await User.findAll({ where: { id: parentIds, role: "parent" } });
      await Promise.all(
        parentUsers.map((parent) =>
          ParentStudent.findOrCreate({ where: { parentId: parent.id, studentId: student.id } }),
        ),
      );
    }

    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      const teacherUsers = await User.findAll({ where: { id: teacherIds, role: "teacher" } });
      await Promise.all(
        teacherUsers.map((teacher) =>
          TeacherStudent.findOrCreate({ where: { teacherId: teacher.id, studentId: student.id } }),
        ),
      );
    }

    return created(res, student, "Student created");
  } catch (error) {
    return fail(res, "Failed to create student", 500, error.message);
  }
};

const listStudents = async (_req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        {
          model: SchoolSection,
          as: "sectionRecord",
          include: [{ model: GradeLevel, as: "gradeLevel" }],
        },
        { model: User, as: "parents", attributes: ["id", "fullName", "email"], through: { attributes: [] } },
        { model: User, as: "teachers", attributes: ["id", "fullName", "email"], through: { attributes: [] } },
      ],
      order: [
        ["className", "ASC"],
        ["firstName", "ASC"],
      ],
    });
    return ok(res, students, "Students fetched");
  } catch (error) {
    return fail(res, "Failed to fetch students", 500, error.message);
  }
};

const listSchoolStructure = async (_req, res) => {
  try {
    const [grades, sections, courses, gradeCourses, teacherAssignments] = await Promise.all([
      GradeLevel.findAll({
        include: [{ model: SchoolSection, as: "sections" }],
        order: [
          ["sortOrder", "ASC"],
          ["name", "ASC"],
        ],
      }),
      SchoolSection.findAll({
        include: [
          { model: GradeLevel, as: "gradeLevel" },
          { model: Student, as: "students", attributes: ["id"] },
        ],
        order: [
          ["gradeLevelId", "ASC"],
          ["name", "ASC"],
        ],
      }),
      Course.findAll({ order: [["name", "ASC"]] }),
      GradeCourse.findAll({
        include: [
          { model: GradeLevel, as: "gradeLevel" },
          { model: Course, as: "course" },
        ],
        order: [["createdAt", "ASC"]],
      }),
      TeacherAssignment.findAll({
        include: [
          { model: User, as: "teacher", attributes: ["id", "fullName", "email"] },
          { model: Course, as: "course" },
          { model: SchoolSection, as: "section", include: [{ model: GradeLevel, as: "gradeLevel" }] },
        ],
        order: [["createdAt", "ASC"]],
      }),
    ]);

    return ok(res, { grades, sections, courses, gradeCourses, teacherAssignments }, "School structure fetched");
  } catch (error) {
    return fail(res, "Failed to fetch school structure", 500, error.message);
  }
};

const createGradeLevel = async (req, res) => {
  try {
    const { name, sortOrder = 0 } = req.body;
    if (!name) return fail(res, "name is required", 400);

    const [gradeLevel, createdFlag] = await GradeLevel.findOrCreate({
      where: { name },
      defaults: { sortOrder },
    });

    if (!createdFlag) {
      gradeLevel.sortOrder = sortOrder;
      await gradeLevel.save();
    }

    return ok(res, gradeLevel, createdFlag ? "Grade created" : "Grade updated", createdFlag ? 201 : 200);
  } catch (error) {
    return fail(res, "Failed to save grade", 500, error.message);
  }
};

const createSection = async (req, res) => {
  try {
    const { gradeLevelId, name, code = null } = req.body;
    if (!gradeLevelId || !name) return fail(res, "gradeLevelId and name are required", 400);

    const gradeLevel = await GradeLevel.findByPk(gradeLevelId);
    if (!gradeLevel) return fail(res, "Grade not found", 404);

    const [section, createdFlag] = await SchoolSection.findOrCreate({
      where: { gradeLevelId, name },
      defaults: { code },
    });

    if (!createdFlag) {
      section.code = code;
      await section.save();
    }

    return ok(res, section, createdFlag ? "Section created" : "Section updated", createdFlag ? 201 : 200);
  } catch (error) {
    return fail(res, "Failed to save section", 500, error.message);
  }
};

const createCourse = async (req, res) => {
  try {
    const { name, code = null } = req.body;
    if (!name) return fail(res, "name is required", 400);

    const [course, createdFlag] = await Course.findOrCreate({
      where: { name },
      defaults: { code },
    });

    if (!createdFlag) {
      course.code = code;
      await course.save();
    }

    return ok(res, course, createdFlag ? "Course created" : "Course updated", createdFlag ? 201 : 200);
  } catch (error) {
    return fail(res, "Failed to save course", 500, error.message);
  }
};

const assignCourseToGrade = async (req, res) => {
  try {
    const { gradeLevelId, courseId } = req.body;
    if (!gradeLevelId || !courseId) return fail(res, "gradeLevelId and courseId are required", 400);

    const gradeLevel = await GradeLevel.findByPk(gradeLevelId);
    const course = await Course.findByPk(courseId);
    if (!gradeLevel || !course) return fail(res, "Grade or course not found", 404);

    const [link] = await GradeCourse.findOrCreate({ where: { gradeLevelId, courseId } });
    return ok(res, link, "Course assigned to grade", 201);
  } catch (error) {
    return fail(res, "Failed to assign course to grade", 500, error.message);
  }
};

const assignTeacherToSectionCourse = async (req, res) => {
  try {
    const { teacherId, courseId, sectionId } = req.body;
    if (!teacherId || !courseId || !sectionId) {
      return fail(res, "teacherId, courseId and sectionId are required", 400);
    }

    const teacher = await User.findOne({ where: { id: teacherId, role: "teacher" } });
    const course = await Course.findByPk(courseId);
    const section = await SchoolSection.findByPk(sectionId, { include: [{ model: GradeLevel, as: "gradeLevel" }] });
    if (!teacher || !course || !section) {
      return fail(res, "Teacher, course or section not found", 404);
    }

    const gradeCourse = await GradeCourse.findOne({
      where: { gradeLevelId: section.gradeLevelId, courseId },
    });
    if (!gradeCourse) {
      return fail(res, "Course must first be assigned to the selected grade", 400);
    }

    const [assignment] = await TeacherAssignment.findOrCreate({ where: { teacherId, courseId, sectionId } });
    return ok(res, assignment, "Teacher assigned to course and section", 201);
  } catch (error) {
    return fail(res, "Failed to assign teacher", 500, error.message);
  }
};

const assignParentToStudent = async (req, res) => {
  try {
    const { studentId, parentId } = req.body;
    if (!studentId || !parentId) {
      return fail(res, "studentId and parentId are required", 400);
    }

    const student = await Student.findByPk(studentId);
    const parent = await User.findOne({ where: { id: parentId, role: "parent" } });

    if (!student || !parent) {
      return fail(res, "Student or parent not found", 404);
    }

    await ParentStudent.findOrCreate({ where: { studentId, parentId } });
    return ok(res, null, "Parent assigned to student");
  } catch (error) {
    return fail(res, "Failed to assign parent", 500, error.message);
  }
};

const assignTeacherToStudent = async (req, res) => {
  try {
    const { studentId, teacherId } = req.body;
    if (!studentId || !teacherId) {
      return fail(res, "studentId and teacherId are required", 400);
    }

    const student = await Student.findByPk(studentId);
    const teacher = await User.findOne({ where: { id: teacherId, role: "teacher" } });

    if (!student || !teacher) {
      return fail(res, "Student or teacher not found", 404);
    }

    await TeacherStudent.findOrCreate({ where: { studentId, teacherId } });
    return ok(res, null, "Teacher assigned to student");
  } catch (error) {
    return fail(res, "Failed to assign teacher", 500, error.message);
  }
};

const listSystemSettings = async (_req, res) => {
  try {
    const settings = await SystemSetting.findAll({ order: [["key", "ASC"]] });
    return ok(res, settings, "Settings fetched");
  } catch (error) {
    return fail(res, "Failed to fetch settings", 500, error.message);
  }
};

const upsertSystemSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return fail(res, "key and value are required", 400);
    }

    const [setting] = await SystemSetting.upsert({ key, value: String(value) });
    return ok(res, setting, "Setting updated");
  } catch (error) {
    return fail(res, "Failed to update setting", 500, error.message);
  }
};

const listNotifications = async (_req, res) => {
  try {
    const notifications = await Notification.findAll({
      include: [{ model: User, as: "user", attributes: ["id", "fullName", "role"] }],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    return ok(res, notifications, "Notifications fetched");
  } catch (error) {
    return fail(res, "Failed to fetch notifications", 500, error.message);
  }
};

const updateRiskThreshold = async (req, res) => {
  try {
    const threshold = Number(req.body.threshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      return fail(res, "threshold must be a number between 0 and 1", 400);
    }

    await upsertSetting(
      AI_SETTINGS.threshold,
      threshold.toFixed(2),
      "High-risk probability cutoff used by the AI service",
    );
    await syncRiskThreshold(threshold);

    return ok(res, { threshold }, "Risk threshold updated");
  } catch (error) {
    return fail(res, "Failed to update risk threshold", 500, error.message);
  }
};

const uploadTrainingCsv = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, "CSV file is required", 400);
    }

    const filePath = path.resolve(req.file.path);
    const fileRecord = {
      filePath,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    await upsertSetting(
      AI_SETTINGS.trainingCsv,
      JSON.stringify(fileRecord),
      "Latest uploaded CSV file used for AI training",
    );

    return ok(
      res,
      {
        fileName: req.file.originalname,
        size: req.file.size,
        uploadedAt: fileRecord.uploadedAt,
      },
      "Training CSV uploaded",
    );
  } catch (error) {
    return fail(res, "Failed to upload training CSV", 500, error.message);
  }
};

const trainModelFromCsv = async (_req, res) => {
  try {
    const trainingSetting = await getSetting(AI_SETTINGS.trainingCsv);
    if (!trainingSetting?.value) {
      return fail(res, "Upload a CSV file before training", 400);
    }

    const trainingFile = JSON.parse(trainingSetting.value);
    if (!trainingFile?.filePath) {
      return fail(res, "Stored training CSV file path is missing", 400);
    }

    const csvText = await fs.readFile(trainingFile.filePath, "utf8");
    const records = buildTrainingRecordsFromCsv(csvText);
    if (records.length < 3) {
      return fail(res, "The uploaded CSV must contain at least 3 valid rows", 400);
    }

    const thresholdSetting = await getSetting(AI_SETTINGS.threshold);
    const threshold = Number(thresholdSetting?.value ?? 0.5);
    if (Number.isFinite(threshold)) {
      await syncRiskThreshold(threshold);
    }

    const response = await axios.post(
      `${env.aiServiceUrl}/train`,
      { records },
      { timeout: 30000 },
    );

    return ok(
      res,
      {
        ...response.data,
        sourceFile: trainingFile.originalName,
        records: records.length,
      },
      "AI model trained from uploaded CSV",
    );
  } catch (error) {
    return fail(res, error.response?.data?.message || error.message, 500);
  }
};

module.exports = {
  listUsers,
  createUser,
  listStudents,
  createStudent,
  listSchoolStructure,
  createGradeLevel,
  createSection,
  createCourse,
  assignCourseToGrade,
  assignTeacherToSectionCourse,
  assignParentToStudent,
  assignTeacherToStudent,
  listSystemSettings,
  upsertSystemSetting,
  listNotifications,
  updateRiskThreshold,
  uploadTrainingCsv,
  trainModelFromCsv,
};
