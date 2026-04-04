const { body, param } = require('express-validator');

const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function noControlChars(value) {
  if (value && CONTROL_CHARS_RE.test(value)) throw new Error('Field contains invalid characters');
  return true;
}

const hotelIdParam = [
  param('hotelId').isUUID().withMessage('hotelId must be a valid UUID'),
];

const createHotelRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('name must be 2–255 characters')
    .custom(noControlChars),

  body('addressLine1')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('addressLine1 is too long')
    .custom(noControlChars),

  body('city')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('city is too long')
    .custom(noControlChars),

  body('country')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('country is too long')
    .custom(noControlChars),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('phone is too long')
    .custom(noControlChars),
];

const updateHotelRules = [
  ...hotelIdParam,

  body('name')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('name must be 2–255 characters')
    .custom(noControlChars),

  body('addressLine1')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('addressLine1 is too long')
    .custom(noControlChars),

  body('city')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('city is too long')
    .custom(noControlChars),

  body('country')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('country is too long')
    .custom(noControlChars),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('phone is too long')
    .custom(noControlChars),
];

const deleteHotelRules = [...hotelIdParam];

const assignUserRules = [
  ...hotelIdParam,
  body('userId').isUUID().withMessage('userId must be a valid UUID'),
];

const listHotelUsersRules = [...hotelIdParam];

module.exports = {
  createHotelRules,
  updateHotelRules,
  deleteHotelRules,
  assignUserRules,
  listHotelUsersRules,
};
