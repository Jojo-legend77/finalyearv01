const { Op } = require("sequelize");
const {
  Student,
  Attendance,
  Grade,
  BehaviorReport,
  User,
  ParentStudent,
  TeacherStudent,
  Notification,
} = require("../models");
const { ok, fail } = require("../utils/response");

const summaryForRecords = (student, attendance, grades, behaviorReports) => {
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = attendance.length ? Number(((present / attendance.length) * 100).toFixed(2)) : 0;
  const avgGrade = grades.length
    ? Number(
        (
          grades.reduce((acc, g) => acc + (Number(g.score) / Number(g.maxScore || 100)) * 100, 0) /
          grades.length
        ).toFixed(2),
      )
    : 0;
  return {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    className: student.className,
    attendanceRate,
    averageGradePercent: avgGrade,
    behaviorReportsCount: behaviorReports.length,
  };
};

const canAccessStudent = async (user, studentId) => {
  if (user.role === "admin") return true;
  if (user.role === "parent") {
    const link = await ParentStudent.findOne({ where: { parentId: user.id, studentId } });
    return !!link;
  }
  if (user.role === "teacher") {
    const link = await TeacherStudent.findOne({ where: { teacherId: user.id, studentId } });
    return !!link;
  }
  return false;
};

exports.getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const allowed = await canAccessStudent(req.user, Number(studentId));
    if (!allowed) return fail(res, "Forbidden", 403);
    const student = await Student.findByPk(studentId);
    if (!student) return fail(res, "Student not found", 404);

    const from = req.query.from || "1900-01-01";
    const to = req.query.to || "2999-12-31";
    const dateRange = { [Op.between]: [from, to] };

    const [attendance, grades, behaviorReports] = await Promise.all([
      Attendance.findAll({ where: { studentId, date: dateRange }, order: [["date", "DESC"]] }),
      Grade.findAll({ where: { studentId, examDate: dateRange }, order: [["examDate", "DESC"]] }),
      BehaviorReport.findAll({
        where: { studentId, incidentDate: dateRange },
        order: [["incidentDate", "DESC"]],
      }),
    ]);

    return ok(
      res,
      {
        student,
        summary: summaryForRecords(student, attendance, grades, behaviorReports),
        attendance,
        grades,
        behaviorReports,
      },
      "Student report generated",
    );
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getSystemSummary = async (_req, res) => {
  try {
    const [users, students, attendance, grades, behaviorReports, notifications] = await Promise.all([
      User.count(),
      Student.count(),
      Attendance.count(),
      Grade.count(),
      BehaviorReport.count(),
      Notification.count(),
    ]);
    const [parent, teacher, admin, schoolDirector] = await Promise.all([
      User.count({ where: { role: "parent" } }),
      User.count({ where: { role: "teacher" } }),
      User.count({ where: { role: "admin" } }),
      User.count({ where: { role: "school_director" } }),
    ]);

    return ok(res, {
      users,
      usersByRole: { parent, teacher, admin, schoolDirector },
      students,
      records: { attendance, grades, behaviorReports, notifications },
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getClassSummary = async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { className: req.params.className },
      order: [["firstName", "ASC"]],
    });
    if (!students.length) return ok(res, { className: req.params.className, students: [], overall: null });

    const studentIds = students.map((item) => item.id);
    const [attendance, grades, behaviorReports] = await Promise.all([
      Attendance.findAll({ where: { studentId: { [Op.in]: studentIds } } }),
      Grade.findAll({ where: { studentId: { [Op.in]: studentIds } } }),
      BehaviorReport.findAll({ where: { studentId: { [Op.in]: studentIds } } }),
    ]);

    const summaries = students.map((student) =>
      summaryForRecords(
        student,
        attendance.filter((row) => row.studentId === student.id),
        grades.filter((row) => row.studentId === student.id),
        behaviorReports.filter((row) => row.studentId === student.id),
      ),
    );

    const avgAttendance =
      summaries.reduce((sum, row) => sum + row.attendanceRate, 0) / Math.max(summaries.length, 1);
    const avgGrade =
      summaries.reduce((sum, row) => sum + row.averageGradePercent, 0) / Math.max(summaries.length, 1);

    return ok(res, {
      className: req.params.className,
      students: summaries,
      overall: {
        averageAttendance: Number(avgAttendance.toFixed(2)),
        averageGrade: Number(avgGrade.toFixed(2)),
      },
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getSchoolReport = async (req, res) => {
  try {
    const students = await Student.findAll({ order: [["className", "ASC"], ["firstName", "ASC"]] });
    if (!students.length) return ok(res, { students: [], overall: null });

    const studentIds = students.map((item) => item.id);
    const [attendance, grades, behaviorReports] = await Promise.all([
      Attendance.findAll({ where: { studentId: { [Op.in]: studentIds } } }),
      Grade.findAll({ where: { studentId: { [Op.in]: studentIds } } }),
      BehaviorReport.findAll({ where: { studentId: { [Op.in]: studentIds } } }),
    ]);

    const summaries = students.map((student) =>
      summaryForRecords(
        student,
        attendance.filter((row) => row.studentId === student.id),
        grades.filter((row) => row.studentId === student.id),
        behaviorReports.filter((row) => row.studentId === student.id),
      ),
    );

    const avgAttendance =
      summaries.reduce((sum, row) => sum + row.attendanceRate, 0) / Math.max(summaries.length, 1);
    const avgGrade =
      summaries.reduce((sum, row) => sum + row.averageGradePercent, 0) / Math.max(summaries.length, 1);

    return ok(res, {
      students: summaries,
      overall: {
        averageAttendance: Number(avgAttendance.toFixed(2)),
        averageGrade: Number(avgGrade.toFixed(2)),
      },
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getMySummary = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return exports.getSystemSummary(req, res);
    }
    if (req.user.role === "school_director") {
      return exports.getSchoolReport(req, res);
    }

    const links =
      req.user.role === "parent"
        ? await ParentStudent.findAll({ where: { parentId: req.user.id }, attributes: ["studentId"] })
        : await TeacherStudent.findAll({ where: { teacherId: req.user.id }, attributes: ["studentId"] });
    const studentIds = links.map((item) => item.studentId);

    if (!studentIds.length) return ok(res, []);
    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      order: [["firstName", "ASC"]],
    });

    const summaries = await Promise.all(
      students.map(async (student) => {
        const [attendance, grades, behaviorReports] = await Promise.all([
          Attendance.findAll({ where: { studentId: student.id } }),
          Grade.findAll({ where: { studentId: student.id } }),
          BehaviorReport.findAll({ where: { studentId: student.id } }),
        ]);
        return summaryForRecords(student, attendance, grades, behaviorReports);
      }),
    );

    return ok(res, summaries);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
