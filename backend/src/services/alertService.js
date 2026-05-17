const { EventEmitter } = require("events");
const { Op } = require("sequelize");
const {
  Alert,
  Attendance,
  BehaviorReport,
  Grade,
  ParentStudent,
  Student,
  TeacherAssignment,
  User,
} = require("../models");
const { notifyUser } = require("./notificationService");
const { sendAlertForwardedEmail } = require("./emailService");
const env = require("../config/env");

const alertHub = new EventEmitter();
alertHub.setMaxListeners(0);

const emitAlert = (alert) => {
  alertHub.emit(`user:${alert.recipientId}`, alert);
};

const createAlert = async (payload) => {
  const alert = await Alert.create(payload);
  emitAlert(alert);
  return alert;
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const summarizeDrop = (label, prevValue, recentValue, suffix) => {
  if (!Number.isFinite(prevValue) || !Number.isFinite(recentValue)) return null;
  const diff = prevValue - recentValue;
  if (diff <= 0) return null;
  return `${label} dropped from ${prevValue}${suffix} to ${recentValue}${suffix}`;
};

const buildAlertMessage = ({ studentName, gradeDrop, attendanceDrop, behaviorIncrease }) => {
  const parts = [
    gradeDrop ? gradeDrop : null,
    attendanceDrop ? attendanceDrop : null,
    behaviorIncrease ? behaviorIncrease : null,
  ].filter(Boolean);

  const summary = parts.length ? parts.join("; ") : "Performance decline detected in recent records.";
  return `Performance alert for ${studentName}. ${summary}`;
};

const getAssignedTeacherIds = async (student) => {
  if (!student.sectionId) return [];
  const assignments = await TeacherAssignment.findAll({
    where: { sectionId: student.sectionId },
    attributes: ["teacherId"],
  });
  return [...new Set(assignments.map((item) => item.teacherId))];
};

const buildWindowSummary = (records, dateKey, sinceDate, untilDate) =>
  records.filter((record) => {
    const value = record[dateKey];
    if (!value) return false;
    const date = new Date(value);
    return date >= sinceDate && date < untilDate;
  });

const averageGrade = (grades) => {
  if (!grades.length) return null;
  const total = grades.reduce((sum, item) => sum + (Number(item.score) / Number(item.maxScore || 100)) * 100, 0);
  return Number((total / grades.length).toFixed(2));
};

const attendanceRate = (records) => {
  if (!records.length) return null;
  const presentCount = records.filter((record) => record.status === "present").length;
  return Number(((presentCount / records.length) * 100).toFixed(2));
};

const generateWeeklyDeclineAlerts = async () => {
  const lookbackStart = daysAgo(14);
  const recentStart = daysAgo(7);
  const now = new Date();

  const students = await Student.findAll({ where: { status: "active" } });

  for (const student of students) {
    const [grades, attendance, behaviorReports] = await Promise.all([
      Grade.findAll({
        where: { studentId: student.id, examDate: { [Op.gte]: lookbackStart } },
      }),
      Attendance.findAll({
        where: { studentId: student.id, date: { [Op.gte]: lookbackStart } },
      }),
      BehaviorReport.findAll({
        where: { studentId: student.id, incidentDate: { [Op.gte]: lookbackStart } },
      }),
    ]);

    const recentGrades = buildWindowSummary(grades, "examDate", recentStart, now);
    const previousGrades = buildWindowSummary(grades, "examDate", lookbackStart, recentStart);
    const recentAttendance = buildWindowSummary(attendance, "date", recentStart, now);
    const previousAttendance = buildWindowSummary(attendance, "date", lookbackStart, recentStart);
    const recentBehavior = buildWindowSummary(behaviorReports, "incidentDate", recentStart, now);
    const previousBehavior = buildWindowSummary(behaviorReports, "incidentDate", lookbackStart, recentStart);

    const prevGradeAvg = averageGrade(previousGrades);
    const recentGradeAvg = averageGrade(recentGrades);
    const prevAttendanceRate = attendanceRate(previousAttendance);
    const recentAttendanceRate = attendanceRate(recentAttendance);

    const gradeDrop =
      prevGradeAvg != null && recentGradeAvg != null && prevGradeAvg - recentGradeAvg >= 10
        ? summarizeDrop("Average grade", prevGradeAvg, recentGradeAvg, "%")
        : null;

    const attendanceDrop =
      prevAttendanceRate != null && recentAttendanceRate != null && prevAttendanceRate - recentAttendanceRate >= 10
        ? summarizeDrop("Attendance rate", prevAttendanceRate, recentAttendanceRate, "%")
        : null;

    const behaviorIncrease =
      recentBehavior.length >= previousBehavior.length + 2
        ? `Behavior incidents increased from ${previousBehavior.length} to ${recentBehavior.length}`
        : null;

    if (!gradeDrop && !attendanceDrop && !behaviorIncrease) {
      continue;
    }

    const teacherIds = await getAssignedTeacherIds(student);
    if (!teacherIds.length) continue;

    for (const teacherId of teacherIds) {
      const existing = await Alert.findOne({
        where: {
          studentId: student.id,
          recipientId: teacherId,
          recipientRole: "teacher",
          source: "auto",
          createdAt: { [Op.gte]: recentStart },
        },
      });

      if (existing) continue;

      await createAlert({
        studentId: student.id,
        recipientId: teacherId,
        recipientRole: "teacher",
        originTeacherId: teacherId,
        title: "Student performance decline",
        message: buildAlertMessage({
          studentName: `${student.firstName} ${student.lastName}`,
          gradeDrop,
          attendanceDrop,
          behaviorIncrease,
        }),
        status: "new",
        source: "auto",
        metadata: {
          gradeDrop,
          attendanceDrop,
          behaviorIncrease,
          recentWindowStart: recentStart,
          previousWindowStart: lookbackStart,
        },
      });
    }
  }
};

const forwardAlertToParents = async (alert, note = "") => {
  const links = await ParentStudent.findAll({
    where: { studentId: alert.studentId },
    attributes: ["parentId"],
  });

  if (!links.length) {
    return [];
  }

  const parentIds = links.map((item) => item.parentId);
  const [student, parents] = await Promise.all([
    Student.findByPk(alert.studentId),
    User.findAll({ where: { id: parentIds } }),
  ]);
  const studentName = student
    ? `${student.firstName} ${student.lastName}`.trim()
    : "your child";
  const parentMessage = note
    ? `${alert.message}\n\nTeacher note: ${note}`
    : `${alert.message}\n\nTeacher reviewed and shared this alert.`;
  const alertsUrl = `${env.appUrl.replace(/\/$/, "")}/alerts`;
  const forwardedAlerts = [];

  for (const parentId of parentIds) {
    const forwarded = await createAlert({
      studentId: alert.studentId,
      recipientId: parentId,
      recipientRole: "parent",
      originTeacherId: alert.originTeacherId,
      originAlertId: alert.id,
      title: "Alert from teacher",
      message: parentMessage,
      status: "forwarded",
      source: "manual",
      metadata: {
        note,
        originAlertId: alert.id,
      },
    });
    forwardedAlerts.push(forwarded);

    const parent = parents.find((item) => item.id === parentId);
    const notificationTitle = `Update about ${studentName}`;
    await notifyUser(parentId, "alert", notificationTitle, parentMessage, {
      kind: "alert_forward",
      studentId: alert.studentId,
      alertId: forwarded.id,
      originAlertId: alert.id,
    }).catch((error) => {
      console.warn("Failed to create parent notification for forwarded alert:", error.message);
    });

    if (parent?.email) {
      await sendAlertForwardedEmail({
        to: parent.email,
        parentName: parent.fullName,
        studentName,
        alertTitle: alert.title || "School alert",
        alertMessage: alert.message,
        teacherNote: note,
        alertsUrl,
      }).catch((error) => {
        console.warn("Failed to email parent for forwarded alert:", error.message);
      });
    }
  }

  return forwardedAlerts;
};

module.exports = {
  alertHub,
  emitAlert,
  createAlert,
  generateWeeklyDeclineAlerts,
  forwardAlertToParents,
};
