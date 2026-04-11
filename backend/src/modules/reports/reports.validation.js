const { query } = require('express-validator');

const MAX_LIMIT = 5000;

const dateLimitRules = [
  query('dateFrom')
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dateFrom must be YYYY-MM-DD'),
  query('dateTo')
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dateTo must be YYYY-MM-DD'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: MAX_LIMIT })
    .withMessage(`limit must be 1–${MAX_LIMIT}`)
    .toInt(),
];

const guestReportRules = [
  ...dateLimitRules,
  query('hotelId').optional().isUUID().withMessage('hotelId must be a valid UUID'),
  query('stayStatus')
    .optional()
    .isIn(['active', 'checked_out', 'cancelled'])
    .withMessage('stayStatus must be active, checked_out, or cancelled'),
  query('hotelCountry').optional().trim().isLength({ max: 120 }),
  query('hotelCity').optional().trim().isLength({ max: 120 }),
];

const blacklistReportRules = [
  ...dateLimitRules,
  query('reasonContains').optional().trim().isLength({ max: 500 }),
];

const alertsReportRules = [
  ...dateLimitRules,
  query('hotelId').optional().isUUID().withMessage('hotelId must be a valid UUID'),
  query('severity').optional().trim().isLength({ max: 80 }),
  query('titleContains').optional().trim().isLength({ max: 200 }),
];

const combinedReportRules = [
  ...dateLimitRules,
  query('hotelId').optional().isUUID(),
  query('stayStatus').optional().isIn(['active', 'checked_out', 'cancelled']),
  query('hotelCountry').optional().trim().isLength({ max: 120 }),
  query('hotelCity').optional().trim().isLength({ max: 120 }),
  query('reasonContains').optional().trim().isLength({ max: 500 }),
  query('severity').optional().trim().isLength({ max: 80 }),
  query('titleContains').optional().trim().isLength({ max: 200 }),
];

module.exports = {
  guestReportRules,
  blacklistReportRules,
  alertsReportRules,
  combinedReportRules,
  MAX_LIMIT,
};
