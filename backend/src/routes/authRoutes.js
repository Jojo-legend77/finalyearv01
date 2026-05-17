const express = require("express");
const {
  login,
  me,
  register,
  refresh,
  logout,
  getSecurityQuestionStatus,
  setupSecurityQuestion,
  forgotPasswordRequestOtp,
  forgotPasswordVerifyOtp,
  forgotPasswordQuestion,
  forgotPasswordVerify,
  forgotPasswordReset,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", authenticate, me);
router.post("/logout", authenticate, logout);
router.get("/security-question/status", authenticate, getSecurityQuestionStatus);
router.post("/security-question/setup", authenticate, setupSecurityQuestion);
router.post("/password-reset/request-otp", forgotPasswordRequestOtp);
router.post("/password-reset/verify-otp", forgotPasswordVerifyOtp);
router.post("/password-reset/question", forgotPasswordQuestion);
router.post("/password-reset/verify", forgotPasswordVerify);
router.post("/password-reset/reset", forgotPasswordReset);

module.exports = router;
