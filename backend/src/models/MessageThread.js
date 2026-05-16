const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MessageThread = sequelize.define(
  "MessageThread",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("student", "direct"),
      allowNull: false,
    },
    studentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    teacherId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    adminId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "message_threads",
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ["student_id"] },
      { fields: ["parent_id"] },
      { fields: ["teacher_id"] },
      { fields: ["admin_id"] },
      { fields: ["type"] },
    ],
  },
);

module.exports = MessageThread;
