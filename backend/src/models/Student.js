const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Student = sequelize.define(
  "Student",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    sectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    className: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    registrationNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    section: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "students",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Student;
