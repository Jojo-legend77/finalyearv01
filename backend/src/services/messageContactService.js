const { Op } = require("sequelize");
const {
  Student,
  User,
  ParentStudent,
  TeacherStudent,
  TeacherAssignment,
} = require("../models");

const getTeacherSectionIds = async (teacherId) => {
  const assignments = await TeacherAssignment.findAll({
    where: { teacherId },
    attributes: ["sectionId"],
  });
  return [...new Set(assignments.map((item) => item.sectionId).filter(Boolean))];
};

const getStudentsForTeacher = async (teacherId) => {
  const sectionIds = await getTeacherSectionIds(teacherId);
  if (sectionIds.length > 0) {
    return Student.findAll({
      where: { sectionId: { [Op.in]: sectionIds } },
      order: [
        ["className", "ASC"],
        ["firstName", "ASC"],
      ],
    });
  }

  const links = await TeacherStudent.findAll({
    where: { teacherId },
    include: [{ model: Student, as: "student" }],
  });
  return links.map((link) => link.student).filter(Boolean);
};

/** Teachers who can message about this student (section assignments + legacy links). */
const getTeachersForStudent = async (student) => {
  if (!student) return [];

  const teacherMap = new Map();

  if (student.sectionId) {
    const assignments = await TeacherAssignment.findAll({
      where: { sectionId: student.sectionId },
      include: [
        {
          model: User,
          as: "teacher",
          attributes: ["id", "fullName", "email", "role"],
          where: { role: "teacher", status: "active" },
          required: true,
        },
      ],
    });
    assignments.forEach((row) => {
      if (row.teacher) teacherMap.set(row.teacher.id, row.teacher);
    });
  }

  const legacyLinks = await TeacherStudent.findAll({
    where: { studentId: student.id },
    include: [
      {
        model: User,
        as: "teacher",
        attributes: ["id", "fullName", "email", "role"],
        where: { role: "teacher", status: "active" },
        required: true,
      },
    ],
  });
  legacyLinks.forEach((row) => {
    if (row.teacher) teacherMap.set(row.teacher.id, row.teacher);
  });

  return Array.from(teacherMap.values());
};

const buildParentStudentThreads = async (parentUser) => {
  const parentLinks = await ParentStudent.findAll({
    where: { parentId: parentUser.id },
    include: [{ model: Student, as: "student" }],
  });

  const studentThreads = [];
  const seen = new Set();

  for (const link of parentLinks) {
    const student = link.student;
    if (!student) continue;

    const teachers = await getTeachersForStudent(student);
    for (const teacher of teachers) {
      const key = `${student.id}-${teacher.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      studentThreads.push({
        student,
        teacher,
        parent: { id: parentUser.id, fullName: parentUser.fullName },
      });
    }
  }

  return studentThreads;
};

const buildTeacherStudentThreads = async (teacherUser) => {
  const students = await getStudentsForTeacher(teacherUser.id);
  if (!students.length) return [];

  const studentIds = students.map((item) => item.id);
  const parentLinks = await ParentStudent.findAll({
    where: { studentId: { [Op.in]: studentIds } },
    include: [
      {
        model: User,
        as: "parent",
        attributes: ["id", "fullName", "email", "role"],
        where: { role: "parent", status: "active" },
        required: true,
      },
    ],
  });

  const studentById = new Map(students.map((item) => [item.id, item]));

  return parentLinks
    .filter((link) => link.parent && studentById.has(link.studentId))
    .map((link) => ({
      student: studentById.get(link.studentId),
      parent: link.parent,
      teacher: { id: teacherUser.id, fullName: teacherUser.fullName },
    }));
};

/** Parent is linked to student and teacher is assigned to that student (section or legacy). */
const canParentAndTeacherMessageAboutStudent = async (parentId, teacherId, studentId) => {
  const parentLink = await ParentStudent.findOne({
    where: { parentId, studentId },
  });
  if (!parentLink) return false;

  const student = await Student.findByPk(studentId);
  if (!student) return false;

  const teachers = await getTeachersForStudent(student);
  return teachers.some((teacher) => Number(teacher.id) === Number(teacherId));
};

module.exports = {
  buildParentStudentThreads,
  buildTeacherStudentThreads,
  canParentAndTeacherMessageAboutStudent,
};
