const jwt = require('jsonwebtoken');

const generateAccessToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const generateEmailVerificationToken = () => {
  const token = require('crypto').randomBytes(32).toString('hex');
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return { token, hashedToken };
};

const generatePasswordResetToken = () => {
  const token = require('crypto').randomBytes(32).toString('hex');
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return { token, hashedToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken
};