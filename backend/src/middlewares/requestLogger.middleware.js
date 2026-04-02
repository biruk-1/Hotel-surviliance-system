const logger = require('../utils/logger');

/**
 * Logs every incoming request and its final response status + duration.
 * Non-intrusive: never calls next(err); only calls next().
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip = req.ip || req.socket?.remoteAddress || '-';

  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : 'info';

    logger[level](`${method} ${originalUrl} ${status} ${ms}ms`, {
      ip,
      userId: req.user?.id || null,
    });
  });

  next();
}

module.exports = requestLogger;
