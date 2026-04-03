const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const logger = require('../utils/logger');

let io = null;

const POLICE_ROOM = 'police';

function hotelRoomId(hotelId) {
  return `hotel:${hotelId}`;
}

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
 * Handshake: JWT required. Roles `police` and `admin` join `police` room (all alerts).
 * Role `hotel` joins `hotel:<uuid>` for each property in `hotel_users`.
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

      const allowed = ['police', 'admin', 'hotel'];
      if (!allowed.includes(payload.role)) {
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

  io.on('connection', async (socket) => {
    const { id: userId, role } = socket.data.user;
    try {
      if (role === 'police' || role === 'admin') {
        await socket.join(POLICE_ROOM);
      } else if (role === 'hotel') {
        const { rows } = await db.query(
          `SELECT hotel_id FROM hotel_users WHERE user_id = $1`,
          [userId]
        );
        for (const row of rows) {
          await socket.join(hotelRoomId(row.hotel_id));
        }
      }
      logger.info('Socket connected', { userId, role, rooms: roomsForLog(socket) });
    } catch (err) {
      logger.error('Socket room join failed', { userId, err });
      socket.disconnect(true);
      return;
    }

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId, reason });
    });
  });

  logger.info('Socket.io ready; event: new_alert (rooms: police, hotel:<id>)');
  return io;
}

function roomsForLog(socket) {
  try {
    return Array.from(socket.rooms).filter((r) => r !== socket.id);
  } catch {
    return [];
  }
}

/**
 * Push a newly created alert to police/admin clients and to the hotel room for that property.
 */
function emitNewAlert(alert) {
  if (!io) {
    logger.warn('emitNewAlert: Socket.io not initialized');
    return;
  }
  if (!alert || !alert.hotel_id) {
    logger.warn('emitNewAlert: alert missing hotel_id');
    return;
  }
  try {
    const payload = { alert };
    io.to(POLICE_ROOM).emit('new_alert', payload);
    io.to(hotelRoomId(alert.hotel_id)).emit('new_alert', payload);
  } catch (err) {
    logger.error('emitNewAlert failed', err);
  }
}

/** @deprecated Use emitNewAlert */
function emitNewAlertToPolice(alert) {
  emitNewAlert(alert);
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
  emitNewAlert,
  emitNewAlertToPolice,
  closeSocketServer,
};
