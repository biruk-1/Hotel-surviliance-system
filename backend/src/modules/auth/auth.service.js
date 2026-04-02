const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const BCRYPT_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

module.exports = {
  BCRYPT_ROUNDS,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
};
