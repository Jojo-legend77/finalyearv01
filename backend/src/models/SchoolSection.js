const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SchoolSection = sequelize.define(
  "SchoolSection",
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    tableName: "school_sections",
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ["grade_level_id", "name"] }],
  },
);

module.exports = SchoolSection;