const { body } = require('express-validator');

const ROLES = ['hotel', 'police', 'admin'];

// Disallow control characters and null bytes in strings.
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function noControlChars(value) {
  if (CONTROL_CHARS_RE.test(value)) {
    throw new Error('Field contains invalid characters');
  }
  return true;
}

const registerRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email is too long')
    .normalizeEmail(),

  body('password')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one digit'),

  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be 2–255 characters')
    .custom(noControlChars),

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
    .isLength({ max: 255 })
    .withMessage('Email is too long')
    .normalizeEmail(),

  body('password')
    .isString()
    .withMessage('Password must be a string')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
];

module.exports = {
  registerRules,
  loginRules,
};
