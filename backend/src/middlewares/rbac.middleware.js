const db = require('../config/database');

/**
 * Requires a valid JWT (use after `authenticate`).
 * Allows the request only if `req.user.role` is one of `allowedRoles`.
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' },
      });
    }
    next();
  };
}

/**
 * Hotel-scoped routes: `/something/:hotelId/...`
 * - `police` and `admin` may access any `hotelId`.
 * - `hotel` may access only if a `hotel_users` row exists for this user and hotel.
 */
function requireHotelAccess(hotelIdParam = 'hotelId') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' },
      });
    }

    const hotelId = req.params[hotelIdParam];
    if (!hotelId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Hotel identifier is required' },
      });
    }

    const { role } = req.user;

    if (role === 'police' || role === 'admin') {
      req.hotelId = hotelId;
      return next();
    }

    if (role === 'hotel') {
      try {
        const { rows } = await db.query(
          `SELECT 1 FROM hotel_users WHERE user_id = $1 AND hotel_id = $2 LIMIT 1`,
          [req.user.id, hotelId]
        );
        if (rows.length === 0) {
          return res.status(403).json({
            success: false,
            error: { message: 'You can only access data for hotels you are assigned to' },
          });
        }
        req.hotelId = hotelId;
        return next();
      } catch (err) {
        return next(err);
      }
    }

    return res.status(403).json({
      success: false,
      error: { message: 'Insufficient permissions' },
    });
  };
}

/** @deprecated Use `authorizeRoles` instead */
const requireRoles = authorizeRoles;

module.exports = {
  authorizeRoles,
  requireHotelAccess,
  requireRoles,
};
