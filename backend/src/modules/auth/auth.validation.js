const { body } = require('express-validator');

const ROLES = ['hotel', 'police', 'admin'];

const registerRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 255 })
    .withMessage('Full name is too long'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(', ')}`),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

module.exports = {
  registerRules,
  loginRules,
};
