const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const staysController = require('./stays.controller');
const { createStayRules } = require('./stays.validation');
const validateRequest = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('hotel', 'police', 'admin'),
  createStayRules,
  validateRequest,
  asyncHandler(staysController.createStay)
);

module.exports = router;
