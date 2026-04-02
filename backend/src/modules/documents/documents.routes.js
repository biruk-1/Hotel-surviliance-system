const express = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/rbac.middleware');
const { attachHotelScope } = require('../../middlewares/hotelScope.middleware');
const { uploadDocumentSingle } = require('../../middlewares/upload.middleware');
const validateRequest = require('../../middlewares/validate.middleware');
const documentsController = require('./documents.controller');
const { uploadDocumentRules } = require('./documents.validation');
const { asyncHandler } = require('../../utils/asyncHandler');

const router = express.Router();

router.post(
  '/',
  authenticate,
  attachHotelScope,
  authorizeRoles('hotel', 'police', 'admin'),
  uploadDocumentSingle,
  uploadDocumentRules,
  validateRequest,
  asyncHandler(documentsController.uploadDocument)
);

module.exports = router;
