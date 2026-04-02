const express = require('express');
const authController = require('./auth.controller');
const { registerRules, loginRules } = require('./auth.validation');
const validateRequest = require('../../middlewares/validate.middleware');
const { authLimiter } = require('../../middlewares/rateLimit.middleware');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  registerRules,
  validateRequest,
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  loginRules,
  validateRequest,
  asyncHandler(authController.login)
);

module.exports = router;
