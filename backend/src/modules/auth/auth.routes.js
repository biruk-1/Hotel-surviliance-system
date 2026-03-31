const express = require('express');
const authController = require('./auth.controller');
const { registerRules, loginRules } = require('./auth.validation');
const validateRequest = require('../../middlewares/validate.middleware');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.post(
  '/register',
  registerRules,
  validateRequest,
  asyncHandler(authController.register)
);

router.post('/login', loginRules, validateRequest, asyncHandler(authController.login));

module.exports = router;
