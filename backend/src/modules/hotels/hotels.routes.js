const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles, requireHotelAccess } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const { parsePagination } = require('../../middlewares/pagination.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const alertsController = require('../alerts/alerts.controller');
const blacklistHotelRoutes = require('../blacklist/blacklist.hotel.routes');
const hotelsController = require('./hotels.controller');
const { createHotelRules, assignUserRules, listHotelUsersRules } = require('./hotels.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('admin'), asyncHandler(hotelsController.listAllHotels));

router.post(
  '/',
  authenticate,
  authorizeRoles('admin'),
  createHotelRules,
  validateRequest,
  asyncHandler(hotelsController.createHotel)
);

router.get(
  '/my-assignments',
  authenticate,
  attachHotelScope,
  asyncHandler(hotelsController.listMyAssignments)
);

router.get(
  '/:hotelId/users',
  authenticate,
  authorizeRoles('admin'),
  listHotelUsersRules,
  validateRequest,
  asyncHandler(hotelsController.listHotelUsers)
);

router.post(
  '/:hotelId/users',
  authenticate,
  authorizeRoles('admin'),
  assignUserRules,
  validateRequest,
  asyncHandler(hotelsController.assignUserToHotel)
);

router.get(
  '/:hotelId/stats',
  authenticate,
  attachHotelScope,
  requireHotelAccess('hotelId'),
  asyncHandler(hotelsController.getHotelStats)
);

router.get(
  '/:hotelId/alerts',
  authenticate,
  attachHotelScope,
  requireHotelAccess('hotelId'),
  parsePagination,
  asyncHandler(alertsController.listAlertsForHotel)
);

router.use('/:hotelId/blacklist', blacklistHotelRoutes);

module.exports = router;
