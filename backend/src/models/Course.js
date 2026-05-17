const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Course = sequelize.define(
  "Course",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: "courses",
    underscored: true,
    timestamps: true,
  },
);

module.exports = Course;