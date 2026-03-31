const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const alertsController = require('./alerts.controller');
const { alertIdParamRules } = require('./alerts.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('police', 'admin', 'hotel'),
  asyncHandler(alertsController.listAllAlerts)
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('police', 'admin', 'hotel'),
  alertIdParamRules,
  validateRequest,
  asyncHandler(alertsController.markAlertReviewed)
);

module.exports = router;
