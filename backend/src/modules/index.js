const express = require('express');
const healthRoutes = require('./health/health.routes');
const authRoutes = require('./auth/auth.routes');
const guestsRoutes = require('./guests/guests.routes');
const staysRoutes = require('./stays/stays.routes');
const alertsRoutes = require('./alerts/alerts.routes');
const hotelsRoutes = require('./hotels/hotels.routes');
const blacklistTopRoutes = require('./blacklist/blacklist.top.routes');
const documentsRoutes = require('./documents/documents.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/guests', guestsRoutes);
router.use('/stays', staysRoutes);
router.use('/alerts', alertsRoutes);
router.use('/blacklist', blacklistTopRoutes);
router.use('/hotels', hotelsRoutes);
router.use('/documents', documentsRoutes);

module.exports = router;
