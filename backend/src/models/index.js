const sequelize = require("../config/database");
const User = require("./User");
const Student = require("./Student");
const ParentStudent = require("./ParentStudent");
const TeacherStudent = require("./TeacherStudent");
const GradeLevel = require("./GradeLevel");
const SchoolSection = require("./SchoolSection");
const Course = require("./Course");
const GradeCourse = require("./GradeCourse");
const TeacherAssignment = require("./TeacherAssignment");
const Attendance = require("./Attendance");
const Grade = require("./Grade");
const BehaviorReport = require("./BehaviorReport");
const Notification = require("./Notification");
const SystemSetting = require("./SystemSetting");
const MessageThread = require("./MessageThread");
const Message = require("./Message");
const Alert = require("./Alert");

User.belongsToMany(Student, {
  through: ParentStudent,
  as: "children",
  foreignKey: "parentId",
  otherKey: "studentId",
});
Student.belongsToMany(User, {
  through: ParentStudent,
  as: "parents",
  foreignKey: "studentId",
  otherKey: "parentId",
});

User.belongsToMany(Student, {
  through: TeacherStudent,
  as: "assignedStudents",
  foreignKey: "teacherId",
  otherKey: "studentId",
});
Student.belongsToMany(User, {
  through: TeacherStudent,
  as: "teachers",
  foreignKey: "studentId",
  otherKey: "teacherId",
});

TeacherStudent.belongsTo(Student, { foreignKey: "studentId", as: "student" });
TeacherStudent.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });
ParentStudent.belongsTo(Student, { foreignKey: "studentId", as: "student" });
ParentStudent.belongsTo(User, { foreignKey: "parentId", as: "parent" });

GradeLevel.hasMany(SchoolSection, { foreignKey: "gradeLevelId", as: "sections" });
SchoolSection.belongsTo(GradeLevel, { foreignKey: "gradeLevelId", as: "gradeLevel" });

GradeLevel.belongsToMany(Course, {
  through: GradeCourse,
  as: "courses",
  foreignKey: "gradeLevelId",
  otherKey: "courseId",
});
Course.belongsToMany(GradeLevel, {
  through: GradeCourse,
  as: "gradeLevels",
  foreignKey: "courseId",
  otherKey: "gradeLevelId",
});

GradeCourse.belongsTo(GradeLevel, { foreignKey: "gradeLevelId", as: "gradeLevel" });
GradeCourse.belongsTo(Course, { foreignKey: "courseId", as: "course" });

SchoolSection.hasMany(Student, { foreignKey: "sectionId", as: "students" });
Student.belongsTo(SchoolSection, { foreignKey: "sectionId", as: "sectionRecord" });

TeacherAssignment.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });
TeacherAssignment.belongsTo(Course, { foreignKey: "courseId", as: "course" });
TeacherAssignment.belongsTo(SchoolSection, { foreignKey: "sectionId", as: "section" });
User.hasMany(TeacherAssignment, { foreignKey: "teacherId", as: "teacherAssignments" });
Course.hasMany(TeacherAssignment, { foreignKey: "courseId", as: "teacherAssignments" });
SchoolSection.hasMany(TeacherAssignment, { foreignKey: "sectionId", as: "teacherAssignments" });

Student.hasMany(Attendance, { foreignKey: "studentId", as: "attendanceRecords" });
Attendance.belongsTo(Student, { foreignKey: "studentId", as: "student" });
Attendance.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

Student.hasMany(Grade, { foreignKey: "studentId", as: "grades" });
Grade.belongsTo(Student, { foreignKey: "studentId", as: "student" });
Grade.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

Student.hasMany(BehaviorReport, { foreignKey: "studentId", as: "behaviorReports" });
BehaviorReport.belongsTo(Student, { foreignKey: "studentId", as: "student" });
BehaviorReport.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

Student.hasMany(Alert, { foreignKey: "studentId", as: "alerts", constraints: false });
Alert.belongsTo(Student, { foreignKey: "studentId", as: "student", constraints: false });

User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

MessageThread.belongsTo(Student, { foreignKey: "studentId", as: "student" });
MessageThread.belongsTo(User, { foreignKey: "parentId", as: "parent" });
MessageThread.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });
MessageThread.belongsTo(User, { foreignKey: "adminId", as: "admin" });
MessageThread.hasMany(Message, { foreignKey: "threadId", as: "messages" });

Message.belongsTo(MessageThread, { foreignKey: "threadId", as: "thread" });
Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });

module.exports = {
  sequelize,
  User,
  Student,
  ParentStudent,
  TeacherStudent,
  GradeLevel,
  SchoolSection,
  Course,
  GradeCourse,
  TeacherAssignment,
  Attendance,
  Grade,
  BehaviorReport,
  Notification,
  SystemSetting,
  MessageThread,
  Message,
  Alert,
};
