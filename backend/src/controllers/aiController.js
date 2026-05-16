const axios = require("axios");
const env = require("../config/env");
const { Attendance, Grade, BehaviorReport, SystemSetting } = require("../models");
const { ok, fail } = require("../utils/response");
const { getAccessibleStudents, filterStudents } = require("../services/studentAccessService");

const AI_THRESHOLD_KEY = "ai_risk_threshold";

const syncRiskThreshold = async () => {
  const setting = await SystemSetting.findOne({ where: { key: AI_THRESHOLD_KEY } });
  const threshold = Number(setting?.value ?? 0.5);

  if (!Number.isFinite(threshold)) {
    return 0.5;
  }

  try {
    await axios.post(`${env.aiServiceUrl}/threshold`, { threshold }, { timeout: 10000 });
  } catch (error) {
    console.warn("Failed to sync AI threshold before prediction:", error.message);
  }

  return threshold;
};

const resolveStudentsForRequest = async (user, query) => {
  const accessible = await getAccessibleStudents(user);
  return filterStudents(accessible, query);
};

const buildFeaturesForStudent = async (student) => {
  const studentId = student.id;
  const [attendance, grades, behaviorReports] = await Promise.all([
    Attendance.findAll({ where: { studentId } }),
    Grade.findAll({ where: { studentId } }),
    BehaviorReport.findAll({ where: { studentId } }),
  ]);

  const attendanceRate = attendance.length
    ? attendance.filter((record) => record.status === "present").length / attendance.length
    : 1;
  const avgGradePercent = grades.length
    ? grades.reduce((sum, item) => sum + Number(item.score / item.maxScore) * 100, 0) / grades.length
    : 0;
  const behaviorRiskScore = behaviorReports.length
    ? behaviorReports.reduce((sum, item) => {
        const map = { LOW: 1, MEDIUM: 2, HIGH: 3 };
        return sum + (map[item.severity] || 0);
      }, 0) / behaviorReports.length
    : 0;

  return {
    studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    attendanceRate: Number(attendanceRate.toFixed(4)),
    avgGradePercent: Number(avgGradePercent.toFixed(2)),
    behaviorRiskScore: Number(behaviorRiskScore.toFixed(2)),
    attendanceCount: attendance.length,
    gradeCount: grades.length,
    behaviorCount: behaviorReports.length,
  };
};

const buildDataset = async (students) => {
  if (!students.length) return [];
  return Promise.all(students.map((student) => buildFeaturesForStudent(student)));
};

const predictRisk = async (req, res) => {
  try {
    await syncRiskThreshold();
    const students = await resolveStudentsForRequest(req.user, req.query);

    if (!students.length) {
      return ok(
        res,
        { records: [], predictions: [] },
        req.query.sectionId || req.query.className
          ? "No students found for the selected class or section."
          : "No accessible students. Assign this teacher to a section or link students first.",
      );
    }

    const records = await buildDataset(students);
    const response = await axios.post(`${env.aiServiceUrl}/predict`, { records }, { timeout: 15000 });

    return ok(res, response.data, "AI risk prediction generated");
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    if (error.code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
      return fail(res, "AI service is not running. Start it on port 8001.", 503);
    }
    return fail(res, message, 500);
  }
};

const trainModel = async (req, res) => {
  try {
    await syncRiskThreshold();
    const students = await resolveStudentsForRequest(req.user, req.query);
    if (!students.length) return fail(res, "No students available for training", 400);

    const records = await buildDataset(students);
    const response = await axios.post(`${env.aiServiceUrl}/train`, { records }, { timeout: 20000 });

    return ok(res, response.data, "AI model trained");
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    if (error.code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
      return fail(res, "AI service is not running. Start it on port 8001.", 503);
    }
    return fail(res, message, 500);
  }
};

const aiSummary = async (req, res) => {
  try {
    await syncRiskThreshold();
    const students = await resolveStudentsForRequest(req.user, req.query);

    if (!students.length) {
      const hint =
        req.query.sectionId || req.query.className
          ? "No students found for the selected class or section."
          : "No student data available yet. Assign students to this teacher's section, or select a class.";
      return ok(res, { summary: hint });
    }

    const records = await buildDataset(students);
    const response = await axios.post(`${env.aiServiceUrl}/summary`, { records }, { timeout: 10000 });
    return ok(res, response.data, "AI summary generated");
  } catch (error) {
    const message = error.response?.data?.message || error.message;
    if (error.code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
      return fail(res, "AI service is not running. Start it on port 8001.", 503);
    }
    return fail(res, message, 500);
  }
};

module.exports = { predictRisk, trainModel, aiSummary };
