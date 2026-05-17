const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MessageThread = sequelize.define(
  "MessageThread",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("student", "direct"),
      allowNull: false,
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    teacherId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER,
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
