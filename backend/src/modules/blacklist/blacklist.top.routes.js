const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const blacklistController = require('./blacklist.controller');
const { createBlacklistBodyRules, listBlacklistQueryRules } = require('./blacklist.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('police', 'admin'),
  listBlacklistQueryRules,
  validateRequest,
  asyncHandler(blacklistController.listAllBlacklist)
);

router.post(
  '/',
  authenticate,
  authorizeRoles('police'),
  createBlacklistBodyRules({ requireHotelId: true }),
  validateRequest,
  asyncHandler(blacklistController.createBlacklistEntry)
);

module.exports = router;
