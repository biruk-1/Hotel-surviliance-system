const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const { parsePagination } = require('../../middlewares/pagination.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const alertsController = require('./alerts.controller');
const { alertIdParamRules, listAlertsQueryRules } = require('./alerts.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

const authScope = [authenticate, attachHotelScope];

router.get(
  '/',
  ...authScope,
  authorizeRoles('police', 'admin', 'hotel'),
  listAlertsQueryRules,
  validateRequest,
  parsePagination,
  asyncHandler(alertsController.listAllAlerts)
);

router.patch(
  '/:id',
  ...authScope,
  authorizeRoles('police', 'admin', 'hotel'),
  alertIdParamRules,
  validateRequest,
  asyncHandler(alertsController.markAlertReviewed)
);

module.exports = router;
