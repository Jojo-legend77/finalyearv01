// backend/config/env.js
const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  jwtPasswordResetExpiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || "15m",
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || "parent_school_platform",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbSync: (process.env.DB_SYNC || "false").toLowerCase() === "true",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8001",
  alertJobEnabled: (process.env.ALERT_JOB_ENABLED || "true").toLowerCase() === "true",
  alertJobIntervalDays: Number(process.env.ALERT_JOB_INTERVAL_DAYS || 7),
  publicRegistrationEnabled: (process.env.PUBLIC_REGISTRATION_ENABLED || "false").toLowerCase() === "true",
  appUrl: process.env.APP_URL || "http://localhost:5173",
  schoolName: process.env.SCHOOL_NAME || "SchoolConnect AI",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  passwordResetOtpMinutes: Number(process.env.PASSWORD_RESET_OTP_MINUTES || 10),
};

module.exports = env; // <-- export directly
