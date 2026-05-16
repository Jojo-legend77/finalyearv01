const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const GradeCourse = sequelize.define(
  "GradeCourse",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    gradeLevelId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.INTEGER.UNSIGNED,
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