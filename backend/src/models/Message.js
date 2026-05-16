const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    threadId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    senderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "messages",
    underscored: true,
    timestamps: true,
    indexes: [{ fields: ["thread_id"] }, { fields: ["sender_id"] }],
  },
);

module.exports = Message;
