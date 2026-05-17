const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ParentStudent = sequelize.define(
  "ParentStudent",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    relationship: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Guardian",
    },
  },
  {
    tableName: "parent_students",
    timestamps: true,
    underscored: true,
    indexes: [{ unique: true, fields: ["parent_id", "student_id"] }],
  }
);

module.exports = ParentStudent;
