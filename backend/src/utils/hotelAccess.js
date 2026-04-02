const db = require('../config/database');
const HttpError = require('./httpError');

function isHotelInScope(accessibleHotelIds, hotelId) {
  if (!hotelId || !accessibleHotelIds || accessibleHotelIds.length === 0) return false;
  const h = String(hotelId);
  return accessibleHotelIds.some((x) => String(x) === h);
}

/**
 * @param {string|null} userId
 * @param {string} role
 * @param {string} hotelId
 * @param {string[]|null} [accessibleHotelIds] - from `req.accessibleHotelIds` when middleware ran; avoids extra DB round-trip.
 */
async function userCanAccessHotel(userId, role, hotelId, accessibleHotelIds = null) {
  if (role === 'police' || role === 'admin') return true;
  if (role === 'hotel') {
    if (accessibleHotelIds != null) {
      return isHotelInScope(accessibleHotelIds, hotelId);
    }
    const { rows } = await db.query(
      `SELECT 1 FROM hotel_users WHERE user_id = $1 AND hotel_id = $2 LIMIT 1`,
      [userId, hotelId]
    );
    return rows.length > 0;
  }
  return false;
}

/**
 * Ensures the user may act on `hotelId`. Requires `attachHotelScope` before this on the same request
 * (except police/admin, which bypass).
 */
function assertHotelAccess(req, hotelId) {
  if (!hotelId) {
    throw new HttpError(400, 'hotelId is required');
  }
  const { role } = req.user;

  if (role === 'police' || role === 'admin') {
    return;
  }

  if (role === 'hotel') {
    const ids = req.accessibleHotelIds;
    if (ids === undefined) {
      throw new HttpError(403, 'Hotel scope not available for this request');
    }
    if (ids.length === 0) {
      throw new HttpError(403, 'You are not assigned to any hotel');
    }
    if (!isHotelInScope(ids, hotelId)) {
      throw new HttpError(403, 'You cannot create or modify data for this hotel');
    }
    return;
  }

  throw new HttpError(403, 'Insufficient permissions');
}

module.exports = {
  userCanAccessHotel,
  assertHotelAccess,
  isHotelInScope,
};
