const db = require('../config/database');
const HttpError = require('./httpError');

async function userCanAccessHotel(userId, role, hotelId) {
  if (role === 'police' || role === 'admin') return true;
  if (role === 'hotel') {
    const { rows } = await db.query(
      `SELECT 1 FROM hotel_users WHERE user_id = $1 AND hotel_id = $2 LIMIT 1`,
      [userId, hotelId]
    );
    return rows.length > 0;
  }
  return false;
}

async function assertHotelAccess(req, hotelId) {
  const ok = await userCanAccessHotel(req.user.id, req.user.role, hotelId);
  if (!ok) {
    throw new HttpError(403, 'You cannot create or modify data for this hotel');
  }
}

module.exports = {
  userCanAccessHotel,
  assertHotelAccess,
};
