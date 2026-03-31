const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { requireHotelAccess } = require('../../middlewares/rbac.middleware');
const alertsController = require('../alerts/alerts.controller');
const blacklistHotelRoutes = require('../blacklist/blacklist.hotel.routes');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.get(
  '/:hotelId/alerts',
  authenticate,
  requireHotelAccess('hotelId'),
  asyncHandler(alertsController.listAlertsForHotel)
);

router.use('/:hotelId/blacklist', blacklistHotelRoutes);

module.exports = router;
