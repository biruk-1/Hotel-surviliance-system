const { body } = require('express-validator');

const uploadDocumentRules = [
  body('stayId').isUUID().withMessage('stayId must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('title must be 1–255 characters'),
];

module.exports = {
  uploadDocumentRules,
};
