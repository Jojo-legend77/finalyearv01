const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("parent", "teacher", "admin", "school_director"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    refreshTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    refreshTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    securityQuestionKey: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    securityAnswerHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    securityQuestionConfiguredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetOtpHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    underscored: true,
    timestamps: true,
  }
);

module.exports = User;
