const { body } = require('express-validator');
const { STAY_STATUSES } = require('../guests/guests.validation');

const createStayRules = [
  body('guestId').isUUID().withMessage('guestId must be a valid UUID'),
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
  body('roomNumber').optional().trim().isLength({ max: 50 }),
  body('status')
    .optional()
    .isIn(STAY_STATUSES)
    .withMessage(`status must be one of: ${STAY_STATUSES.join(', ')}`),
];

module.exports = {
  createStayRules,
};
