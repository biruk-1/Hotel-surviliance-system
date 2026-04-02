const express = require('express');
const healthController = require('./health.controller');
const { healthLimiter } = require('../../middlewares/rateLimit.middleware');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.get('/', healthLimiter, asyncHandler(healthController.getHealth));

module.exports = router;
