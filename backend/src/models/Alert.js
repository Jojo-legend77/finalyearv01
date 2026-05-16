const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Alert = sequelize.define(
  "Alert",
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
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recipientRole: {
      type: DataTypes.ENUM("teacher", "parent"),
      allowNull: false,
    },
    originTeacherId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    originAlertId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("new", "handled", "forwarded"),
      allowNull: false,
      defaultValue: "new",
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    source: {
      type: DataTypes.ENUM("auto", "manual"),
      allowNull: false,
      defaultValue: "auto",
    },
    handledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    forwardedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "alerts",
    timestamps: true,
  }
);

module.exports = Alert;
