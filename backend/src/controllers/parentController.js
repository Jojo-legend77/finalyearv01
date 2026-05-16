const { Op } = require("sequelize");
const { Attendance, BehaviorReport, Grade, Student, ParentStudent } = require("../models");
const { ok, fail } = require("../utils/response");

const toProgressSummary = (attendanceRecords, grades, behaviorReports) => {
  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((a) => a.status === "present").length;
  const attendanceRate = totalAttendance ? Number(((presentCount / totalAttendance) * 100).toFixed(2)) : 0;
  const averageGradePercent = grades.length
    ? Number(
        (
          grades.reduce((sum, item) => sum + (Number(item.score) / Number(item.maxScore || 100)) * 100, 0) /
          grades.length
        ).toFixed(2),
      )
    : 0;
  return {
    attendanceRate,
    averageGradePercent,
    behaviorReportsCount: behaviorReports.length,
  };
};

const getLinkedStudentIds = async (parentId) => {
  const links = await ParentStudent.findAll({
    where: { parentId },
    attributes: ["studentId"],
  });
  return links.map((link) => link.studentId);
};

const getMyStudents = async (req, res) => {
  try {
    const studentIds = await getLinkedStudentIds(req.user.id);
    if (!studentIds.length) return ok(res, []);

    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      order: [
        ["className", "ASC"],
        ["firstName", "ASC"],
      ],
    });
    return ok(res, students);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const getStudentDetails = async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const studentIds = await getLinkedStudentIds(req.user.id);
    if (!studentIds.includes(studentId)) {
      return fail(res, "You do not have access to this student", 403);
    }

    const [student, attendance, grades, behaviorReports] = await Promise.all([
      Student.findByPk(studentId),
      Attendance.findAll({ where: { studentId }, order: [["date", "DESC"]], limit: 100 }),
      Grade.findAll({ where: { studentId }, order: [["examDate", "DESC"]], limit: 100 }),
      BehaviorReport.findAll({ where: { studentId }, order: [["incidentDate", "DESC"]], limit: 100 }),
    ]);

    return ok(res, {
      student,
      summary: toProgressSummary(attendance, grades, behaviorReports),
      records: {
        attendance,
        grades,
        behaviorReports,
      },
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const getChildSummary = async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const studentIds = await getLinkedStudentIds(req.user.id);
    if (!studentIds.includes(studentId)) {
      return fail(res, "You do not have access to this student", 403);
    }

    const [attendance, grades, behaviorReports] = await Promise.all([
      Attendance.findAll({ where: { studentId } }),
      Grade.findAll({ where: { studentId } }),
      BehaviorReport.findAll({ where: { studentId } }),
    ]);

    return ok(res, toProgressSummary(attendance, grades, behaviorReports));
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = {
  getMyStudents,
  getStudentDetails,
  getChildSummary,
};
