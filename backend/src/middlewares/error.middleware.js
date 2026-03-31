const multer = require('multer');
const logger = require('../utils/logger');
const config = require('../config');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: { message: 'File too large (maximum 5 MB)' },
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: { message: err.message || 'Upload failed' },
    });
    return;
  }

  const status = err.statusCode || err.status || 500;
  const message =
    status === 500 && config.nodeEnv === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  logger.error('Request error', err);

  res.status(status).json({
    success: false,
    error: {
      message,
      ...(config.nodeEnv !== 'production' && err.stack && { stack: err.stack }),
    },
  });
}

module.exports = errorMiddleware;
