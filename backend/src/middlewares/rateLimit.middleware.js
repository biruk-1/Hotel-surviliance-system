const rateLimit = require('express-rate-limit');
const config = require('../config');

const isProd = config.nodeEnv === 'production';

/** Set PERF_SKIP_RATE_LIMIT=1 (non-production only) when running load tests so limits do not distort results. */
const skipRateLimitForPerf = process.env.PERF_SKIP_RATE_LIMIT === '1' && !isProd;
const passThrough = (req, res, next) => next();

function makeRateLimitResponse(req, res) {
  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests. Please wait a moment and try again.',
      retryAfter: Math.ceil(res.getHeader('Retry-After') || 60),
    },
  });
}

const strictHandler = {
  handler: makeRateLimitResponse,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

/**
 * Auth routes (login / register) — tight: 20 attempts per 15 min.
 * Prevents brute-force against passwords.
 */
const authLimiter = skipRateLimitForPerf
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isProd ? 20 : 200,
      skipSuccessfulRequests: false,
      ...strictHandler,
    });

/**
 * Global API limit — allows 400 hotels × ~10 concurrent users × bursts.
 * 300 req / 1 min per IP is generous for normal use but blocks scrapers.
 */
const globalApiLimiter = skipRateLimitForPerf
  ? passThrough
  : rateLimit({
      windowMs: 60 * 1000,
      max: isProd ? 300 : 3000,
      ...strictHandler,
    });

/**
 * Write-heavy endpoints (guest create, blacklist create, document upload).
 * 60 writes / min per IP.
 */
const writeOperationLimiter = skipRateLimitForPerf
  ? passThrough
  : rateLimit({
      windowMs: 60 * 1000,
      max: isProd ? 60 : 600,
      ...strictHandler,
    });

/**
 * Health check — allow frequent polling without counting toward other limits.
 */
const healthLimiter = skipRateLimitForPerf
  ? passThrough
  : rateLimit({
      windowMs: 60 * 1000,
      max: isProd ? 60 : 600,
      ...strictHandler,
    });

module.exports = {
  authLimiter,
  globalApiLimiter,
  writeOperationLimiter,
  healthLimiter,
};
