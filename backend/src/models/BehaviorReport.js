const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BehaviorReport = sequelize.define(
  "BehaviorReport",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "students", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    incidentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
      allowNull: false,
      defaultValue: "MEDIUM",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    actionTaken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "behavior_reports",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["student_id"] }, { fields: ["teacher_id"] }, { fields: ["incident_date"] }],
  }
);

module.exports = BehaviorReport;
