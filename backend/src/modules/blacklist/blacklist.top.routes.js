const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const { parsePagination } = require('../../middlewares/pagination.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const blacklistController = require('./blacklist.controller');
const {
  createBlacklistBodyRules,
  listBlacklistQueryRules,
  blacklistIdParamRules,
} = require('./blacklist.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

const authScope = [authenticate, attachHotelScope];

router.get(
  '/',
  ...authScope,
  authorizeRoles('police', 'admin'),
  listBlacklistQueryRules,
  validateRequest,
  parsePagination,
  asyncHandler(blacklistController.listAllBlacklist)
);

router.post(
  '/',
  ...authScope,
  authorizeRoles('police'),
  createBlacklistBodyRules({ optionalHotelId: true }),
  validateRequest,
  asyncHandler(blacklistController.createBlacklistEntry)
);

router.delete(
  '/:id',
  ...authScope,
  authorizeRoles('police', 'admin'),
  blacklistIdParamRules,
  validateRequest,
  asyncHandler(blacklistController.removeBlacklistEntryById)
);

module.exports = router;
