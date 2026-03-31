const { body, param, query } = require('express-validator');

const STAY_STATUSES = ['active', 'checked_out', 'cancelled'];

const createGuestWithStayRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('fullName is required')
    .isLength({ max: 255 })
    .withMessage('fullName is too long'),
  body('idNumber')
    .trim()
    .notEmpty()
    .withMessage('idNumber is required')
    .isLength({ max: 120 })
    .withMessage('idNumber is too long'),
  body('hotelId').isUUID().withMessage('hotelId must be a valid UUID'),
  body('checkIn')
    .notEmpty()
    .withMessage('checkIn is required')
    .isISO8601()
    .withMessage('checkIn must be a valid ISO 8601 date'),
  body('checkOut')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('checkOut must be a valid ISO 8601 date'),
  body('roomNumber').optional().trim().isLength({ max: 50 }).withMessage('roomNumber is too long'),
  body('phone').optional().trim().isLength({ max: 50 }),
  body('email')
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .withMessage('Invalid email'),
  body('notes').optional().isString().isLength({ max: 10000 }),
  body('dateOfBirth')
    .optional({ values: 'null' })
    .isISO8601({ strict: false })
    .withMessage('dateOfBirth must be a valid date'),
  body('status')
    .optional()
    .isIn(STAY_STATUSES)
    .withMessage(`status must be one of: ${STAY_STATUSES.join(', ')}`),
];

const guestIdParamRules = [param('id').isUUID().withMessage('Invalid guest id')];

const listGuestsQueryRules = [
  query('hotelId').optional().isUUID().withMessage('hotelId query must be a valid UUID'),
];

module.exports = {
  createGuestWithStayRules,
  guestIdParamRules,
  listGuestsQueryRules,
  STAY_STATUSES,
};
