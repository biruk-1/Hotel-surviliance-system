const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const blacklistController = require('./blacklist.controller');
const { createBlacklistBodyRules } = require('./blacklist.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  authorizeRoles('police', 'admin'),
  asyncHandler(blacklistController.listBlacklistByHotel)
);

router.post(
  '/',
  authenticate,
  authorizeRoles('police'),
  createBlacklistBodyRules({ requireHotelId: false }),
  validateRequest,
  asyncHandler(blacklistController.createBlacklistEntry)
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('police'),
  asyncHandler(blacklistController.removeBlacklistEntry)
);

module.exports = router;
