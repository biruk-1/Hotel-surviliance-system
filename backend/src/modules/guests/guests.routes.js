const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const guestsController = require('./guests.controller');
const validateRequest = require('../../middlewares/validate.middleware');
const {
  createGuestWithStayRules,
  guestIdParamRules,
  listGuestsQueryRules,
} = require('./guests.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorizeRoles('hotel', 'police', 'admin'),
  createGuestWithStayRules,
  validateRequest,
  asyncHandler(guestsController.createGuestWithStay)
);

router.get(
  '/',
  authenticate,
  authorizeRoles('hotel', 'police', 'admin'),
  listGuestsQueryRules,
  validateRequest,
  asyncHandler(guestsController.listGuests)
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles('hotel', 'police', 'admin'),
  guestIdParamRules,
  validateRequest,
  asyncHandler(guestsController.getGuestById)
);

module.exports = router;
