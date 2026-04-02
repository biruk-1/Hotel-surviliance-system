const { isHotelInScope } = require('../utils/hotelAccess');

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
 * - `hotel` may access only if `hotelId` is in `req.accessibleHotelIds` (set by `attachHotelScope`).
 */
function requireHotelAccess(hotelIdParam = 'hotelId') {
  return (req, res, next) => {
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
      const ids = req.accessibleHotelIds;
      if (ids === undefined) {
        return res.status(403).json({
          success: false,
          error: { message: 'Hotel scope not available for this request' },
        });
      }
      if (ids.length === 0 || !isHotelInScope(ids, hotelId)) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only access data for hotels you are assigned to' },
        });
      }
      req.hotelId = hotelId;
      return next();
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
