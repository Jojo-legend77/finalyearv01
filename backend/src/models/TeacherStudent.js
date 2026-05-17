const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TeacherStudent = sequelize.define(
  "TeacherStudent",
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
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "teacher_students",
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ["teacher_id", "student_id"] }],
  }
);

module.exports = TeacherStudent;
