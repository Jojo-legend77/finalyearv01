const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const GradeCourse = sequelize.define(
  "GradeCourse",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gradeLevelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "grade_courses",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["grade_level_id", "course_id"] }],
  },
);

module.exports = GradeCourse;