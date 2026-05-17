const app = require("./app");
const { DataTypes } = require("sequelize");
const env = require("./config/env");
const { sequelize, Alert } = require("./models");
const { generateWeeklyDeclineAlerts } = require("./services/alertService");

const scheduleWeeklyAlerts = () => {
  if (!env.alertJobEnabled) return;

  const intervalDays = Number.isFinite(env.alertJobIntervalDays) && env.alertJobIntervalDays > 0
    ? env.alertJobIntervalDays
    : 7;
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  const runJob = async () => {
    try {
      await generateWeeklyDeclineAlerts();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Weekly alert scan failed:", error.message);
    }
  };

  runJob();
  setInterval(runJob, intervalMs);
};

const ensureUserSecurityColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable("users");

  if (!table.security_question_key) {
    await queryInterface.addColumn("users", "security_question_key", {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
  }
  if (!table.security_answer_hash) {
    await queryInterface.addColumn("users", "security_answer_hash", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
  if (!table.security_question_configured_at) {
    await queryInterface.addColumn("users", "security_question_configured_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!table.password_reset_otp_hash) {
    await queryInterface.addColumn("users", "password_reset_otp_hash", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
  if (!table.password_reset_otp_expires_at) {
    await queryInterface.addColumn("users", "password_reset_otp_expires_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
};

async function start() {
  try {
    await sequelize.authenticate();
    await ensureUserSecurityColumns();
    // Ensure alerts feature can run even when full DB sync is disabled.
    // Do not block backend startup if prerequisite tables are missing.
    try {
      await Alert.sync();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Alert table sync skipped:", error.message);
    }
    if (env.dbSync) {
      await sequelize.sync({ alter: true });
      // eslint-disable-next-line no-console
      console.log("Database synchronized");
    }

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on port ${env.port}`);
    });

    scheduleWeeklyAlerts();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

start();
