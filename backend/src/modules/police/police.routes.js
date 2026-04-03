const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const policeController = require('./police.controller');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.get(
  '/stats',
  authenticate,
  authorizeRoles('police'),
  asyncHandler(policeController.getDashboardStats)
);

module.exports = router;
