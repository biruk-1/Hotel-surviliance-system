const { body, param } = require('express-validator');
const { paginationRules } = require('../guests/guests.validation');

const createBlacklistBodyRules = (options = {}) => {
  const { optionalHotelId = false } = options;
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
    body('phone')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 50 })
      .withMessage('phone is too long')
      .matches(/^[+\d\s\-(). ]+$/)
      .withMessage('phone contains invalid characters'),
    body('checkoutDate')
      .optional({ values: 'falsy' })
      .isISO8601({ strict: false })
      .withMessage('checkoutDate must be a valid date'),
    body('reason').optional().isString().isLength({ max: 2000 }),
  ];
  if (optionalHotelId) {
    rules.push(
      body('hotelId').optional({ values: 'falsy' }).isUUID().withMessage('hotelId must be a valid UUID')
    );
  }
  return rules;
};

const listBlacklistQueryRules = [...paginationRules];

const blacklistIdParamRules = [param('id').isUUID().withMessage('id must be a valid UUID')];

module.exports = {
  createBlacklistBodyRules,
  listBlacklistQueryRules,
  blacklistIdParamRules,
};
