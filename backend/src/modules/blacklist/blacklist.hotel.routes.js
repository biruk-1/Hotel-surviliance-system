const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const { writeOperationLimiter } = require('../../middlewares/rateLimit.middleware');
const { parsePagination } = require('../../middlewares/pagination.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const blacklistController = require('./blacklist.controller');
const { createBlacklistBodyRules, listBlacklistQueryRules } = require('./blacklist.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router({ mergeParams: true });

const authScope = [authenticate, attachHotelScope];

router.get(
  '/',
  ...authScope,
  authorizeRoles('police', 'admin'),
  listBlacklistQueryRules,
  validateRequest,
  parsePagination,
  asyncHandler(blacklistController.listBlacklistByHotel)
);

router.post(
  '/',
  ...authScope,
  authorizeRoles('police'),
  writeOperationLimiter,
  createBlacklistBodyRules({ requireHotelId: false }),
  validateRequest,
  asyncHandler(blacklistController.createBlacklistEntry)
);

router.delete(
  '/:id',
  ...authScope,
  authorizeRoles('police'),
  asyncHandler(blacklistController.removeBlacklistEntry)
);

module.exports = router;
