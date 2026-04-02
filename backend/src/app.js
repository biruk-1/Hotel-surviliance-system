const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const apiRoutes = require('./modules');
const errorMiddleware = require('./middlewares/error.middleware');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const requestLogger = require('./middlewares/requestLogger.middleware');
const { globalApiLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
  })
);

// Trust the first proxy hop (nginx, load balancer).
// Required so express-rate-limit reads the real client IP.
app.set('trust proxy', 1);

// ── Response compression (CPU trade-off wins at scale) ─────────────────────
app.use(compression({ threshold: 1024 }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Body parsing ─────────────────────────────────────────────────────────────
// 100 KB limit for JSON: large guest payloads don't need more.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ── Global rate limit (applied to all /api routes) ─────────────────────────
app.use('/api', globalApiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Fallthrough handlers ─────────────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
