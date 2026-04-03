const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const adminController = require('./admin.controller');
const { createUserRules, listUsersRules } = require('./admin.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));

router.get(
  '/users',
  listUsersRules,
  validateRequest,
  asyncHandler(adminController.listUsers)
);

router.post(
  '/users',
  createUserRules,
  validateRequest,
  asyncHandler(adminController.createUser)
);

module.exports = router;
