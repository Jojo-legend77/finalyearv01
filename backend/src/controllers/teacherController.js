const { Op } = require("sequelize");
const {
  Attendance,
  BehaviorReport,
  Grade,
  Student,
  TeacherStudent,
  TeacherAssignment,
  SchoolSection,
  GradeLevel,
} = require("../models");
const { ok, fail } = require("../utils/response");
const { notifyParentsForStudent } = require("../services/notificationService");

const getTeacherSections = async (teacherId) => {
  const assignments = await TeacherAssignment.findAll({
    where: { teacherId },
    attributes: ["sectionId"],
  });
  return [...new Set(assignments.map((assignment) => assignment.sectionId))];
};

const ensureAssigned = async (teacherId, studentId) => {
  const student = await Student.findByPk(studentId);
  if (!student) return false;

  const sectionAssignments = await TeacherAssignment.findOne({
    where: { teacherId, sectionId: student.sectionId },
  });
  if (sectionAssignments) return true;

  const legacyRecord = await TeacherStudent.findOne({ where: { teacherId, studentId } });
  return !!legacyRecord;
};

const getAssignedStudents = async (req, res) => {
  try {
    const sectionIds = await getTeacherSections(req.user.id);

    if (sectionIds.length > 0) {
      const students = await Student.findAll({
        where: { sectionId: { [Op.in]: sectionIds } },
        include: [
          {
            model: SchoolSection,
            as: "sectionRecord",
            include: [{ model: GradeLevel, as: "gradeLevel" }],
          },
        ],
        order: [
          ["className", "ASC"],
          ["firstName", "ASC"],
        ],
      });

      return ok(res, students);
    }

    const links = await TeacherStudent.findAll({
      where: { teacherId: req.user.id },
      include: [{ model: Student, as: "student" }],
      order: [["createdAt", "DESC"]],
    });

    return ok(res, links.map((link) => link.student));
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const recordAttendance = async (req, res) => {
  try {
    const { studentId, date, status, note } = req.body;
    if (!studentId || !date || !status) {
      return fail(res, "studentId, date and status are required", 400);
    }

    const assigned = await ensureAssigned(req.user.id, studentId);
    if (!assigned) return fail(res, "Student is not assigned to this teacher", 403);

    const attendance = await Attendance.create({
      studentId,
      teacherId: req.user.id,
      date,
      status,
      note: note || null,
    });

    await notifyParentsForStudent(
      studentId,
      "attendance",
      "Attendance update",
      `Attendance marked as ${status} for ${date}`,
      { attendanceId: attendance.id, status, date },
    );

    return ok(res, attendance, "Attendance recorded");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const recordGrade = async (req, res) => {
  try {
    const { studentId, subject, assessmentType, score, maxScore, term, note } = req.body;
    if (!studentId || !subject || score == null || maxScore == null) {
      return fail(res, "studentId, subject, score, and maxScore are required", 400);
    }

    const assigned = await ensureAssigned(req.user.id, studentId);
    if (!assigned) return fail(res, "Student is not assigned to this teacher", 403);

    const percentage = (Number(score) / Number(maxScore)) * 100;
    const grade = await Grade.create({
      studentId,
      teacherId: req.user.id,
      subject,
      assessmentType: assessmentType || "Assignment",
      score,
      maxScore,
      percentage,
      term: term || null,
      note: note || null,
    });

    await notifyParentsForStudent(
      studentId,
      "grade",
      "Grade update",
      `New ${subject} score: ${score}/${maxScore}`,
      { gradeId: grade.id, subject, score, maxScore },
    );

    return ok(res, grade, "Grade recorded");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const recordBehavior = async (req, res) => {
  try {
    const { studentId, incidentDate, category, severity, description, actionTaken } = req.body;
    if (!studentId || !incidentDate || !category || !description) {
      return fail(res, "studentId, incidentDate, category, and description are required", 400);
    }

    const assigned = await ensureAssigned(req.user.id, studentId);
    if (!assigned) return fail(res, "Student is not assigned to this teacher", 403);

    const behavior = await BehaviorReport.create({
      studentId,
      teacherId: req.user.id,
      incidentDate,
      category,
      severity: (severity || "MEDIUM").toUpperCase(),
      description,
      actionTaken: actionTaken || null,
    });

    await notifyParentsForStudent(
      studentId,
      "behavior",
      "Behavior update",
      `${category}: ${description.slice(0, 80)}`,
      { behaviorReportId: behavior.id, category, severity: behavior.severity },
    );

    return ok(res, behavior, "Behavior report recorded");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

const getTeacherRecentRecords = async (req, res) => {
  try {
    const studentLinks = await TeacherStudent.findAll({
      where: { teacherId: req.user.id },
      attributes: ["studentId"],
    });
    const sectionIds = await getTeacherSections(req.user.id);
    let studentIds = [];

    if (sectionIds.length > 0) {
      const students = await Student.findAll({
        where: { sectionId: { [Op.in]: sectionIds } },
        attributes: ["id"],
      });
      studentIds = students.map((student) => student.id);
    } else {
      studentIds = studentLinks.map((link) => link.studentId);
    }

    if (studentIds.length === 0) {
      return ok(res, { attendance: [], grades: [], behaviorReports: [] });
    }

    const [attendance, grades, behaviorReports] = await Promise.all([
      Attendance.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        include: [{ model: Student, as: "student", attributes: ["id", "firstName", "lastName"] }],
        order: [["date", "DESC"]],
        limit: 20,
      }),
      Grade.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        include: [{ model: Student, as: "student", attributes: ["id", "firstName", "lastName"] }],
        order: [["examDate", "DESC"]],
        limit: 20,
      }),
      BehaviorReport.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        include: [{ model: Student, as: "student", attributes: ["id", "firstName", "lastName"] }],
        order: [["incidentDate", "DESC"]],
        limit: 20,
      }),
    ]);

    return ok(res, { attendance, grades, behaviorReports });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = {
  getAssignedStudents,
  recordAttendance,
  recordGrade,
  recordBehavior,
  getTeacherRecentRecords,
};
