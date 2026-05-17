const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Notification } = require("../models");
const { signToken, signRefreshToken, signPasswordResetToken } = require("../utils/jwt");
const env = require("../config/env");
const { ok, created, fail } = require("../utils/response");
const { generateOtp, hashOtp, verifyOtp } = require("../services/otpService");
const { sendPasswordResetOtpEmail } = require("../services/emailService");
const {
  SECURITY_QUESTION_OPTIONS,
  SECURITY_SETUP_NOTIFICATION_KIND,
} = require("../constants/securityQuestions");

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  status: user.status,
  securityQuestionConfigured: Boolean(user.securityQuestionConfiguredAt && user.securityQuestionKey),
});

const allowedSecurityRoles = new Set(["parent", "teacher"]);
const allowedQuestionKeys = new Set(SECURITY_QUESTION_OPTIONS.map((item) => item.key));

const questionLabel = (key) => SECURITY_QUESTION_OPTIONS.find((item) => item.key === key)?.label || key;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const otpRequestLog = new Map();

const canRequestOtp = (email) => {
  const now = Date.now();
  const entry = otpRequestLog.get(email) || { count: 0, windowStart: now };
  if (now - entry.windowStart > 15 * 60 * 1000) {
    entry.count = 0;
    entry.windowStart = now;
  }
  if (entry.count >= 5) return false;
  entry.count += 1;
  otpRequestLog.set(email, entry);
  return true;
};

const otpSuccessMessage = "If your account is eligible, a verification code has been sent to your email.";

const computeRefreshExpiry = () => {
  const value = env.jwtRefreshExpiresIn || "7d";
  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + amount * (multipliers[unit] || multipliers.d));
};

const issueTokens = async (user) => {
  const token = signToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  const refreshTokenExpiresAt = computeRefreshExpiry();

  await user.update({ refreshTokenHash, refreshTokenExpiresAt });

  return {
    token,
    refreshToken,
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
  };
};

exports.register = async (req, res) => {
  try {
    if (!env.publicRegistrationEnabled) {
      return fail(
        res,
        "Self-registration is disabled. Please contact the school administration office to request an account.",
        403,
      );
    }

    const { fullName, email, password, role = "parent" } = req.body;
    if (!fullName || !email || !password) {
      return fail(res, "fullName, email and password are required", 400);
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return fail(res, "Email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email,
      passwordHash: hashedPassword,
      role,
      status: "active",
    });

    const tokens = await issueTokens(user);
    return created(res, {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return fail(res, "email and password are required", 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return fail(res, "Invalid credentials", 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return fail(res, "Invalid credentials", 401);
    }

    if (user.status !== "active") {
      return fail(res, "Account is not active", 403);
    }

    const tokens = await issueTokens(user);
    return ok(res, {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.me = async (req, res) => {
  return ok(res, {
    user: sanitizeUser(req.user),
  });
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return fail(res, "refreshToken is required", 400);

    const payload = jwt.verify(refreshToken, env.jwtSecret);
    if (payload.type !== "refresh") return fail(res, "Invalid refresh token", 401);

    const user = await User.findByPk(payload.id);
    if (!user || user.status !== "active") return fail(res, "Unauthorized account", 401);
    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      return fail(res, "Refresh token not recognized", 401);
    }
    if (new Date(user.refreshTokenExpiresAt).getTime() < Date.now()) {
      return fail(res, "Refresh token expired", 401);
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) return fail(res, "Invalid refresh token", 401);

    const tokens = await issueTokens(user);
    return ok(res, {
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return fail(res, "Invalid or expired token", 401);
  }
};

exports.logout = async (req, res) => {
  try {
    await req.user.update({ refreshTokenHash: null, refreshTokenExpiresAt: null });
    return ok(res, null, "Logged out");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getSecurityQuestionStatus = async (req, res) => {
  if (!allowedSecurityRoles.has(req.user.role)) {
    return ok(res, {
      enabled: false,
      configured: true,
      options: [],
    });
  }

  return ok(res, {
    enabled: true,
    configured: Boolean(req.user.securityQuestionConfiguredAt && req.user.securityQuestionKey),
    selectedQuestionKey: req.user.securityQuestionKey || null,
    options: SECURITY_QUESTION_OPTIONS,
  });
};

exports.setupSecurityQuestion = async (req, res) => {
  try {
    if (!allowedSecurityRoles.has(req.user.role)) {
      return fail(res, "Security question setup is only available for parent and teacher accounts.", 403);
    }
    if (req.user.securityQuestionConfiguredAt && req.user.securityQuestionKey) {
      return fail(res, "Security question is already configured.", 400);
    }

    const questionKey = String(req.body?.questionKey || "").trim();
    const answer = String(req.body?.answer || "").trim();

    if (!allowedQuestionKeys.has(questionKey)) {
      return fail(res, "Please choose a valid security question.", 400);
    }
    if (answer.length < 2) {
      return fail(res, "Please provide a valid answer.", 400);
    }

    const securityAnswerHash = await bcrypt.hash(answer.toLowerCase(), 12);
    await req.user.update({
      securityQuestionKey: questionKey,
      securityAnswerHash,
      securityQuestionConfiguredAt: new Date(),
    });

    const notifications = await Notification.findAll({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    const setupNotificationIds = notifications
      .filter((item) => item.metadata?.kind === SECURITY_SETUP_NOTIFICATION_KIND)
      .map((item) => item.id);
    if (setupNotificationIds.length) {
      await Notification.update(
        { isRead: true },
        { where: { id: setupNotificationIds, userId: req.user.id } },
      );
    }

    return ok(res, { configured: true }, "Security question configured.");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.forgotPasswordRequestOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return fail(res, "Email is required.", 400);
    }

    if (!canRequestOtp(email)) {
      return fail(res, "Too many code requests. Please wait a few minutes and try again.", 429);
    }

    const user = await User.findOne({ where: { email } });
    if (user && allowedSecurityRoles.has(user.role)) {
      const otp = generateOtp();
      const passwordResetOtpHash = await hashOtp(otp);
      const expiresAt = new Date(Date.now() + env.passwordResetOtpMinutes * 60 * 1000);
      await user.update({
        passwordResetOtpHash,
        passwordResetOtpExpiresAt: expiresAt,
      });

      try {
        await sendPasswordResetOtpEmail({
          to: user.email,
          fullName: user.fullName,
          otp,
          expiresMinutes: env.passwordResetOtpMinutes,
        });
      } catch (mailError) {
        console.warn("Failed to send password reset OTP email:", mailError.message);
        return fail(
          res,
          "Could not send verification email. Check SMTP settings or try the security question method.",
          503,
        );
      }
    }

    return ok(res, null, otpSuccessMessage);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    if (!email || !otp) {
      return fail(res, "Email and verification code are required.", 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !allowedSecurityRoles.has(user.role)) {
      return fail(res, "Invalid email or verification code.", 401);
    }
    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return fail(res, "No active verification code. Request a new code.", 400);
    }
    if (new Date(user.passwordResetOtpExpiresAt).getTime() < Date.now()) {
      return fail(res, "Verification code has expired. Request a new code.", 400);
    }

    const matches = await verifyOtp(otp, user.passwordResetOtpHash);
    if (!matches) {
      return fail(res, "Invalid email or verification code.", 401);
    }

    await user.update({
      passwordResetOtpHash: null,
      passwordResetOtpExpiresAt: null,
    });

    const resetToken = signPasswordResetToken(user);
    return ok(res, { resetToken }, "Code verified. You may set a new password.");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.forgotPasswordQuestion = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return fail(res, "Email is required.", 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !allowedSecurityRoles.has(user.role)) {
      return fail(res, "No eligible account found for this email.", 404);
    }
    if (!user.securityQuestionKey || !user.securityAnswerHash) {
      return fail(
        res,
        "Security question is not set for this account. Please contact an administrator.",
        400,
      );
    }

    return ok(res, {
      questionKey: user.securityQuestionKey,
      questionLabel: questionLabel(user.securityQuestionKey),
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.forgotPasswordVerify = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const answer = String(req.body?.answer || "").trim();
    if (!email || !answer) {
      return fail(res, "Email and answer are required.", 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !allowedSecurityRoles.has(user.role)) {
      return fail(res, "Invalid email or answer.", 401);
    }
    if (!user.securityAnswerHash) {
      return fail(res, "Security question is not configured.", 400);
    }

    const matches = await bcrypt.compare(answer.toLowerCase(), user.securityAnswerHash);
    if (!matches) {
      return fail(res, "Invalid email or answer.", 401);
    }

    const resetToken = signPasswordResetToken(user);
    return ok(res, { resetToken }, "Answer verified. You may set a new password.");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.forgotPasswordReset = async (req, res) => {
  try {
    const resetToken = String(req.body?.resetToken || "").trim();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!resetToken || !password || !confirmPassword) {
      return fail(res, "resetToken, password, and confirmPassword are required.", 400);
    }
    if (password !== confirmPassword) {
      return fail(res, "Passwords do not match.", 400);
    }
    if (password.length < 8) {
      return fail(res, "Password must be at least 8 characters.", 400);
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, env.jwtSecret);
    } catch (_err) {
      return fail(res, "Reset link is invalid or has expired.", 401);
    }
    if (payload.type !== "password_reset" || !payload.id) {
      return fail(res, "Reset link is invalid.", 401);
    }

    const user = await User.findByPk(payload.id);
    if (!user || !allowedSecurityRoles.has(user.role)) {
      return fail(res, "Reset link is invalid.", 401);
    }
    if (normalizeEmail(user.email) !== normalizeEmail(payload.email)) {
      return fail(res, "Reset link is invalid.", 401);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await user.update({
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      passwordResetOtpHash: null,
      passwordResetOtpExpiresAt: null,
    });

    return ok(res, null, "Password updated. Please sign in with your new password.");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
