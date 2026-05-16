const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SystemSetting = sequelize.define(
  "SystemSetting",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "system_settings",
    timestamps: true,
    underscored: true,
  }
);

module.exports = SystemSetting;
