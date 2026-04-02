const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

let io = null;

function extractToken(socket) {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

  const q = socket.handshake.query && socket.handshake.query.token;
  if (typeof q === 'string' && q.trim()) return q.trim();
  if (Array.isArray(q) && q[0] && String(q[0]).trim()) return String(q[0]).trim();

  return null;
}

/**
 * Attach Socket.io to the same HTTP server as Express.
 * Only users with JWT role `police` can connect; others are rejected at handshake.
 */
function initSocketServer(httpServer) {
  const origin = process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || '*';

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    serveClient: false,
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('auth_required'));
      }

      const payload = jwt.verify(token, config.auth.jwtSecret);

      if (payload.role !== 'police') {
        return next(new Error('forbidden'));
      }

      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return next(new Error('invalid_token'));
      }
      next(err);
    }
  });

  io.on('connection', (socket) => {
    logger.info('Police socket connected', { userId: socket.data.user.id });
    socket.on('disconnect', (reason) => {
      logger.info('Police socket disconnected', { userId: socket.data.user.id, reason });
    });
  });

  logger.info('Socket.io ready (police-only); event: new_alert');
  return io;
}

/**
 * Broadcast a newly created alert to all connected police clients.
 */
function emitNewAlertToPolice(alert) {
  if (!io) {
    logger.warn('emitNewAlertToPolice: Socket.io not initialized');
    return;
  }
  try {
    io.emit('new_alert', { alert });
  } catch (err) {
    logger.error('emitNewAlertToPolice failed', err);
  }
}

/**
 * Closes Socket.io and the underlying HTTP server (same instance passed to init).
 */
async function closeSocketServer() {
  if (!io) return;
  const instance = io;
  io = null;
  await instance.close();
}

module.exports = {
  initSocketServer,
  emitNewAlertToPolice,
  closeSocketServer,
};
