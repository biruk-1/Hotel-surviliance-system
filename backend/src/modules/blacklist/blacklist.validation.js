const { body, query } = require('express-validator');
const { paginationRules } = require('../guests/guests.validation');

const createBlacklistBodyRules = (options = {}) => {
  const { requireHotelId = false } = options;
  const rules = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('name is required')
      .isLength({ max: 255 })
      .withMessage('name is too long'),
    body('idNumber')
      .trim()
      .notEmpty()
      .withMessage('idNumber is required')
      .isLength({ max: 120 })
      .withMessage('idNumber is too long'),
    body('dateOfBirth')
      .notEmpty()
      .withMessage('dateOfBirth is required')
      .isISO8601({ strict: false })
      .withMessage('dateOfBirth must be a valid date (e.g. YYYY-MM-DD or ISO 8601)'),
    body('reason').optional().isString().isLength({ max: 2000 }),
  ];
  if (requireHotelId) {
    rules.unshift(body('hotelId').isUUID().withMessage('hotelId must be a valid UUID'));
  }
  return rules;
};

const listBlacklistQueryRules = [
  query('hotelId').optional().isUUID().withMessage('hotelId must be a valid UUID'),
  ...paginationRules,
];

module.exports = {
  createBlacklistBodyRules,
  listBlacklistQueryRules,
};
