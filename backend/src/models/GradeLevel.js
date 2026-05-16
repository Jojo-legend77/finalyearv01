const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const GradeLevel = sequelize.define(
  "GradeLevel",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "grade_levels",
    underscored: true,
    timestamps: true,
  },
);

module.exports = GradeLevel;