const { Op } = require("sequelize");
const {
  Student,
  ParentStudent,
  TeacherStudent,
  TeacherAssignment,
  SchoolSection,
  GradeLevel,
} = require("../models");

const getTeacherSectionIds = async (teacherId) => {
  const assignments = await TeacherAssignment.findAll({
    where: { teacherId },
    attributes: ["sectionId"],
  });
  return [...new Set(assignments.map((item) => item.sectionId).filter(Boolean))];
};

const getAccessibleStudents = async (user) => {
  if (user.role === "admin") {
    return Student.findAll({
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
  }

  if (user.role === "parent") {
    const links = await ParentStudent.findAll({
      where: { parentId: user.id },
      attributes: ["studentId"],
    });
    const studentIds = links.map((item) => item.studentId);
    if (!studentIds.length) return [];
    return Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      include: [
        {
          model: SchoolSection,
          as: "sectionRecord",
          include: [{ model: GradeLevel, as: "gradeLevel" }],
        },
      ],
      order: [["firstName", "ASC"]],
    });
  }

  if (user.role === "teacher") {
    const sectionIds = await getTeacherSectionIds(user.id);
    if (sectionIds.length > 0) {
      return Student.findAll({
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
    }

    const links = await TeacherStudent.findAll({
      where: { teacherId: user.id },
      attributes: ["studentId"],
    });
    const studentIds = links.map((item) => item.studentId);
    if (!studentIds.length) return [];

    return Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      include: [
        {
          model: SchoolSection,
          as: "sectionRecord",
          include: [{ model: GradeLevel, as: "gradeLevel" }],
        },
      ],
      order: [["firstName", "ASC"]],
    });
  }

  return [];
};

const filterStudents = (students, query = {}) => {
  let filtered = students;

  if (query.studentId) {
    const studentId = Number(query.studentId);
    filtered = filtered.filter((student) => student.id === studentId);
  }

  if (query.sectionId) {
    const sectionId = Number(query.sectionId);
    filtered = filtered.filter((student) => Number(student.sectionId) === sectionId);
  }

  if (query.className) {
    const className = String(query.className).trim().toLowerCase();
    filtered = filtered.filter(
      (student) =>
        String(student.className || "").toLowerCase() === className ||
        String(student.sectionRecord?.gradeLevel?.name || "").toLowerCase() === className,
    );
  }

  return filtered;
};

module.exports = {
  getAccessibleStudents,
  filterStudents,
};
