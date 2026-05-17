const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const hashOtp = async (otp) => bcrypt.hash(otp, 10);

const verifyOtp = async (otp, hash) => {
  if (!otp || !hash) return false;
  return bcrypt.compare(String(otp).trim(), hash);
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};
