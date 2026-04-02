const multer = require('multer');
const logger = require('../utils/logger');
const config = require('../config');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  // ── Multer file-upload errors ───────────────────────────────────────────────
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: { message: 'File too large (maximum 5 MB)' },
      });
    }
    return res.status(400).json({
      success: false,
      error: { message: err.message || 'Upload failed' },
    });
  }

  // ── JWT / auth library signals ──────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid token' },
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { message: 'Token has expired' },
    });
  }

  // ── PostgreSQL driver errors ────────────────────────────────────────────────
  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid UUID format in request' },
    });
  }
  if (err.code === '23503') {
    return res.status(409).json({
      success: false,
      error: { message: 'Related record not found (foreign key constraint)' },
    });
  }
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { message: 'Duplicate record — this entry already exists' },
    });
  }
  if (err.code && err.code.startsWith('57')) {
    logger.error('PostgreSQL statement/query timeout', err);
    return res.status(503).json({
      success: false,
      error: { message: 'Database timeout — please retry' },
    });
  }

  // ── Application HttpError ───────────────────────────────────────────────────
  const status = err.statusCode || err.status || 500;
  const isProd = config.nodeEnv === 'production';
  const message = status === 500 && isProd ? 'Internal Server Error' : err.message || 'Internal Server Error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${status}`, err);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      ...(config.nodeEnv !== 'production' && status >= 500 && err.stack && { stack: err.stack }),
    },
  });
}

module.exports = errorMiddleware;
