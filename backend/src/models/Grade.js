const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Grade = sequelize.define(
  "Grade",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    assessmentType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "Assignment",
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    maxScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100,
    },
    term: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    examDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "grades",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["student_id"] }, { fields: ["teacher_id"] }, { fields: ["subject"] }],
  }
);

module.exports = Grade;
