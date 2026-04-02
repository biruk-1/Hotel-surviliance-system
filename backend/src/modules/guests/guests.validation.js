const { body, param, query } = require('express-validator');

const STAY_STATUSES = ['active', 'checked_out', 'cancelled'];

const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function noControlChars(value) {
  if (value && CONTROL_CHARS_RE.test(value)) throw new Error('Field contains invalid characters');
  return true;
}

function sanitiseText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+/g, ' ').trim();
}

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
];

const createGuestWithStayRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('fullName is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('fullName must be 2–255 characters')
    .custom(noControlChars)
    .customSanitizer(sanitiseText),

  body('idNumber')
    .trim()
    .notEmpty()
    .withMessage('idNumber is required')
    .isLength({ min: 1, max: 120 })
    .withMessage('idNumber must be 1–120 characters')
    .custom(noControlChars),

  body('hotelId')
    .isUUID()
    .withMessage('hotelId must be a valid UUID'),

  body('checkIn')
    .notEmpty()
    .withMessage('checkIn is required')
    .isISO8601()
    .withMessage('checkIn must be a valid ISO 8601 date'),

  body('checkOut')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('checkOut must be a valid ISO 8601 date'),

  body('roomNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('roomNumber is too long')
    .custom(noControlChars),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('phone is too long')
    .matches(/^[+\d\s\-(). ]+$/)
    .withMessage('phone contains invalid characters'),

  body('email')
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .withMessage('Invalid email')
    .isLength({ max: 255 })
    .withMessage('email is too long')
    .normalizeEmail(),

  body('notes')
    .optional()
    .isString()
    .withMessage('notes must be a string')
    .isLength({ max: 10000 })
    .withMessage('notes is too long (max 10000 characters)')
    .custom(noControlChars),

  body('dateOfBirth')
    .optional({ values: 'null' })
    .isISO8601({ strict: false })
    .withMessage('dateOfBirth must be a valid date'),

  body('status')
    .optional()
    .isIn(STAY_STATUSES)
    .withMessage(`status must be one of: ${STAY_STATUSES.join(', ')}`),
];

const guestIdParamRules = [
  param('id').isUUID().withMessage('Invalid guest id'),
];

const listGuestsQueryRules = [
  query('hotelId').optional().isUUID().withMessage('hotelId query must be a valid UUID'),
  ...paginationRules,
];

module.exports = {
  createGuestWithStayRules,
  guestIdParamRules,
  listGuestsQueryRules,
  paginationRules,
  STAY_STATUSES,
};
