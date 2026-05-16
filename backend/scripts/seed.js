const bcrypt = require("bcryptjs");
const { DataTypes } = require("sequelize");
const sequelize = require("../src/config/database");
const {
  User,
  Student,
  Attendance,
  Grade,
  BehaviorReport,
  ParentStudent,
  TeacherStudent,
  SystemSetting,
  GradeLevel,
  SchoolSection,
  Course,
  GradeCourse,
  TeacherAssignment,
  MessageThread,
  Message,
  Notification,
} = require("../src/models");

const gradePlan = [
  {
    name: "Grade 1",
    sortOrder: 1,
    sections: ["A", "B", "C", "D"],
    teachers: [
      { subject: "Maths", fullName: "Abebe Alemu", email: "teacher@school.local" },
      { subject: "Amharic", fullName: "Hana Tesfaye", email: "grade1.amharic@school.local" },
      { subject: "English", fullName: "Solomon Bekele", email: "grade1.english@school.local" },
      { subject: "Sport", fullName: "Tigist Mulu", email: "grade1.sport@school.local" },
      { subject: "Science", fullName: "Meseret Kebede", email: "grade1.science@school.local" },
    ],
  },
  {
    name: "Grade 2",
    sortOrder: 2,
    sections: ["A", "B", "C", "D"],
    teachers: [
      { subject: "Maths", fullName: "Yonas Ayele", email: "grade2.maths@school.local" },
      { subject: "Amharic", fullName: "Meron Assefa", email: "grade2.amharic@school.local" },
      { subject: "English", fullName: "Daniel Hailu", email: "grade2.english@school.local" },
      { subject: "Sport", fullName: "Selamawit Teka", email: "grade2.sport@school.local" },
      { subject: "Science", fullName: "Aster Wondimu", email: "grade2.science@school.local" },
    ],
  },
  {
    name: "Grade 3",
    sortOrder: 3,
    sections: ["A", "B", "C", "D"],
    teachers: [
      { subject: "Maths", fullName: "Binyam Fikru", email: "grade3.maths@school.local" },
      { subject: "Amharic", fullName: "Lidia Girma", email: "grade3.amharic@school.local" },
      { subject: "English", fullName: "Meklit Kassa", email: "grade3.english@school.local" },
      { subject: "Sport", fullName: "Dawit Adugna", email: "grade3.sport@school.local" },
      { subject: "Science", fullName: "Hirut Mulu", email: "grade3.science@school.local" },
    ],
  },
  {
    name: "Grade 4",
    sortOrder: 4,
    sections: ["A", "B", "C", "D"],
    teachers: [
      { subject: "Maths", fullName: "Natnael Negash", email: "grade4.maths@school.local" },
      { subject: "Amharic", fullName: "Rahel Yimer", email: "grade4.amharic@school.local" },
      { subject: "English", fullName: "Kalkidan Bekele", email: "grade4.english@school.local" },
      { subject: "Sport", fullName: "Tadesse Wubshet", email: "grade4.sport@school.local" },
      { subject: "Science", fullName: "Martha Alemu", email: "grade4.science@school.local" },
    ],
  },
];

const parentProfiles = [
  { fullName: "Hanna Girma", email: "parent@school.local" },
  { fullName: "Aster Mekonnen", email: "parent1@school.local" },
  { fullName: "Mulu Kebede", email: "parent2@school.local" },
  { fullName: "Sara Abebe", email: "parent3@school.local" },
];

const studentFirstNames = [
  "Mihret", "Nahom", "Selamawit", "Abel", "Lidia", "Yonas", "Eden", "Dawit",
  "Saron", "Kaleab", "Elsabet", "Yonatan", "Meklit", "Natnael", "Yewubdar", "Samuel",
  "Rahel", "Kibrom", "Mahlet", "Henok", "Tigist", "Binyam", "Hirut", "Aster",
  "Mulu", "Tsedey", "Kalkidan", "Martha", "Tsion", "Eyerusalem", "Fikirte", "Mekdes",
  "Meron", "Sinet", "Tamirat", "Kiros", "Alem", "Birtukan", "Sara", "Hana",
];

const studentLastNames = [
  "Alemu", "Tesfaye", "Kebede", "Bekele", "Mekonnen", "Assefa", "Girma", "Hailu",
  "Tadesse", "Wondimu", "Fikru", "Ayele", "Teka", "Kassa", "Adugna", "Geremew",
  "Mulu", "Negash", "Yimer", "Abebe", "Seyoum", "Wubshet", "Alemayehu", "Desta",
  "Gebre", "Mamo", "Shiferaw", "Bekri", "Tadesse", "Alem", "Bekele", "Mekonnen",
  "Tilahun", "Kebede", "Tesema", "Alemu", "Bishaw", "Worku", "Degu", "Desta",
];

const assessmentCycle = ["Mid", "Quiz", "Final"];

const hashPassword = (value) => bcrypt.hash(value, 12);
const toDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};
const buildRegistrationNumber = (gradeOrder, section, index) =>
  `G${gradeOrder}${section}${String(index + 1).padStart(3, "0")}`;

const buildStudentName = (gradeOrder, sectionIndex, studentIndex) => {
  const offset = (gradeOrder * 11) + (sectionIndex * 7) + studentIndex;
  return {
    firstName: studentFirstNames[offset % studentFirstNames.length],
    lastName: studentLastNames[(offset * 3) % studentLastNames.length],
  };
};

const resetTables = async () => {
  const modelsToClear = [
    Message,
    MessageThread,
    Notification,
    BehaviorReport,
    Grade,
    Attendance,
    ParentStudent,
    TeacherStudent,
    TeacherAssignment,
    GradeCourse,
    Student,
    SchoolSection,
    Course,
    GradeLevel,
    SystemSetting,
    User,
  ];

  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const model of modelsToClear) {
    await model.destroy({ where: {}, truncate: true });
  }
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
};

async function seedData() {
  await resetTables();

  await SystemSetting.create({
    key: "school_context",
    value: JSON.stringify({
      name: "Final Year Academy",
      contactEmail: "admin@school.local",
      contactPhone: "+1-555-0100",
    }),
  });

  await SystemSetting.create({ key: "academic_year", value: "2025/2026" });
  await SystemSetting.create({ key: "grading_period", value: "Term 1" });
  await SystemSetting.create({ key: "attendance_cutoff", value: "75" });

  const admin = await User.create({
    fullName: "Admin User",
    email: "admin@school.local",
    passwordHash: await hashPassword("Admin123!"),
    role: "admin",
    status: "active",
  });

  const director = await User.create({
    fullName: "School Director",
    email: "director@school.local",
    passwordHash: await hashPassword("Director123!"),
    role: "school_director",
    status: "active",
  });

  const parentUsers = [];
  for (const profile of parentProfiles) {
    const parent = await User.create({
      fullName: profile.fullName,
      email: profile.email,
      passwordHash: await hashPassword("Parent123!"),
      role: "parent",
      status: "active",
    });
    parentUsers.push(parent);
  }

  const courses = new Map();
  for (const subject of ["Maths", "Amharic", "English", "Sport", "Science"]) {
    const course = await Course.create({ name: subject });
    courses.set(subject, course);
  }

  const gradeContexts = [];
  const teacherByGradeSubject = new Map();

  for (const grade of gradePlan) {
    const gradeLevel = await GradeLevel.create({
      name: grade.name,
      sortOrder: grade.sortOrder,
    });

    const sectionRecords = [];
    for (const sectionName of grade.sections) {
      const section = await SchoolSection.create({
        gradeLevelId: gradeLevel.id,
        name: sectionName,
        code: `${grade.sortOrder}${sectionName}`,
      });
      sectionRecords.push(section);
    }

    const teacherRecords = [];
    for (const teacherSeed of grade.teachers) {
      const teacher = await User.create({
        fullName: teacherSeed.fullName,
        email: teacherSeed.email,
        passwordHash: await hashPassword("Teacher123!"),
        role: "teacher",
        status: "active",
      });
      teacherRecords.push({ ...teacherSeed, record: teacher });
      teacherByGradeSubject.set(`${grade.name}:${teacherSeed.subject}`, teacher);
    }

    for (const subject of ["Maths", "Amharic", "English", "Sport", "Science"]) {
      await GradeCourse.create({
        gradeLevelId: gradeLevel.id,
        courseId: courses.get(subject).id,
      });
    }

    for (const section of sectionRecords) {
      for (const teacherSeed of grade.teachers) {
        const teacher = teacherByGradeSubject.get(`${grade.name}:${teacherSeed.subject}`);
        await TeacherAssignment.create({
          teacherId: teacher.id,
          courseId: courses.get(teacherSeed.subject).id,
          sectionId: section.id,
        });
      }
    }

    gradeContexts.push({ grade, gradeLevel, sectionRecords, teacherRecords });
  }

  const gradeSampleStudents = [];
  let globalStudentIndex = 0;

  for (const context of gradeContexts) {
    for (let sectionIndex = 0; sectionIndex < context.sectionRecords.length; sectionIndex += 1) {
      const section = context.sectionRecords[sectionIndex];
      for (let studentIndex = 0; studentIndex < 20; studentIndex += 1) {
        const { firstName, lastName } = buildStudentName(context.grade.sortOrder, sectionIndex, studentIndex);
        const birthYear = 2019 - context.grade.sortOrder;
        const birthMonth = String(((studentIndex + sectionIndex) % 12) + 1).padStart(2, "0");
        const birthDay = String(((studentIndex * 2) % 27) + 1).padStart(2, "0");
        const student = await Student.create({
          registrationNumber: buildRegistrationNumber(context.grade.sortOrder, section.name, studentIndex),
          firstName,
          lastName,
          dateOfBirth: `${birthYear}-${birthMonth}-${birthDay}`,
          className: context.grade.name,
          section: section.name,
          sectionId: section.id,
          status: "active",
        });

        if (studentIndex === 0) {
          gradeSampleStudents.push({ student, grade: context.grade });
        }

        const classTeacher = teacherByGradeSubject.get(`${context.grade.name}:Maths`);
        await Attendance.create({
          studentId: student.id,
          teacherId: classTeacher.id,
          date: toDate(globalStudentIndex % 10),
          status: globalStudentIndex % 3 === 0 ? "late" : "present",
          note: "Seeded attendance record",
        });

        if (studentIndex % 4 === 0) {
          await Grade.create({
            studentId: student.id,
            teacherId: classTeacher.id,
            subject: "Maths",
            assessmentType: assessmentCycle[studentIndex % assessmentCycle.length],
            score: 70 + ((studentIndex + context.grade.sortOrder) % 25),
            maxScore: 100,
            term: "Term 1",
            examDate: toDate(globalStudentIndex % 14),
            remark: "Seeded grade record",
          });
        }

        if (studentIndex % 8 === 0) {
          await BehaviorReport.create({
            studentId: student.id,
            teacherId: classTeacher.id,
            incidentDate: toDate(globalStudentIndex % 12),
            category: "Participation",
            severity: studentIndex % 16 === 0 ? "MEDIUM" : "LOW",
            description: "Seeded behavior note for demonstration purposes.",
            actionTaken: "Monitored by the classroom teacher.",
          });
        }

        globalStudentIndex += 1;
      }
    }
  }

  console.log("Seed completed successfully.");
  console.log(`Admin login: ${admin.email} / Admin123!`);
  console.log(`Director login: ${director.email} / Director123!`);
  console.log(`Parent demo login: ${parentUsers[0].email} / Parent123!`);
  console.log(`Teacher demo login: teacher@school.local / Teacher123!`);
  console.log(`Seeded grades: ${gradePlan.map((grade) => grade.name).join(", ")}`);
  console.log("Teachers: 20, sections: 16, students: 320");
}

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
