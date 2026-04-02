const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const { writeOperationLimiter } = require('../../middlewares/rateLimit.middleware');
const { parsePagination } = require('../../middlewares/pagination.middleware');
const guestsController = require('./guests.controller');
const validateRequest = require('../../middlewares/validate.middleware');
const {
  createGuestWithStayRules,
  guestIdParamRules,
  listGuestsQueryRules,
} = require('./guests.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

const authScope = [authenticate, attachHotelScope];

router.post(
  '/',
  ...authScope,
  authorizeRoles('hotel', 'police', 'admin'),
  writeOperationLimiter,
  createGuestWithStayRules,
  validateRequest,
  asyncHandler(guestsController.createGuestWithStay)
);

router.get(
  '/',
  ...authScope,
  authorizeRoles('hotel', 'police', 'admin'),
  listGuestsQueryRules,
  validateRequest,
  parsePagination,
  asyncHandler(guestsController.listGuests)
);

router.get(
  '/:id',
  ...authScope,
  authorizeRoles('hotel', 'police', 'admin'),
  guestIdParamRules,
  validateRequest,
  asyncHandler(guestsController.getGuestById)
);

module.exports = router;
