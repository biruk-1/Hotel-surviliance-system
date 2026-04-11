const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/asyncHandler');
const reportsController = require('./reports.controller');
const {
  guestReportRules,
  blacklistReportRules,
  alertsReportRules,
  combinedReportRules,
} = require('./reports.validation');

const router = express.Router();

const policeOrAdmin = [authenticate, authorizeRoles('police', 'admin')];

/** Guest-stay report: hotel staff see only stays at their assigned properties. */
router.get(
  '/guests',
  authenticate,
  attachHotelScope,
  authorizeRoles('police', 'admin', 'hotel'),
  guestReportRules,
  validateRequest,
  asyncHandler(reportsController.reportGuests)
);

router.get(
  '/blacklist',
  ...policeOrAdmin,
  blacklistReportRules,
  validateRequest,
  asyncHandler(reportsController.reportBlacklist)
);

router.get(
  '/alerts',
  ...policeOrAdmin,
  alertsReportRules,
  validateRequest,
  asyncHandler(reportsController.reportAlerts)
);

router.get(
  '/combined',
  ...policeOrAdmin,
  combinedReportRules,
  validateRequest,
  asyncHandler(reportsController.reportCombined)
);

module.exports = router;
