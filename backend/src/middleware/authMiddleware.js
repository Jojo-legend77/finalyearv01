const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { User } = require("../models");

const getUserFromToken = async (token) => {
  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findByPk(payload.id);

  if (!user || user.status !== "active") {
    return null;
  }

  return user;
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ message: "Unauthorized account" });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authenticateSse = async (req, res, next) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).json({ message: "Missing or invalid token" });
    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ message: "Unauthorized account" });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authenticate, authenticateSse };
