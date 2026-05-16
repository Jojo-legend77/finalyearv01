const jwt = require("jsonwebtoken");
const env = require("../config/env");

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

const signRefreshToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: "refresh",
    },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn },
  );

const signPasswordResetToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "password_reset",
    },
    env.jwtSecret,
    { expiresIn: env.jwtPasswordResetExpiresIn },
  );

module.exports = { signToken, signRefreshToken, signPasswordResetToken };
