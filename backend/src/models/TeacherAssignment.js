const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TeacherAssignment = sequelize.define(
  "TeacherAssignment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "teacher_assignments",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["teacher_id", "course_id", "section_id"] }],
  },
);

module.exports = TeacherAssignment;