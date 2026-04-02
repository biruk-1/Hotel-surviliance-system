const db = require('../config/database');

/**
 * After `authenticate`, loads the caller's hotel assignments into `req.accessibleHotelIds`.
 * - `police` / `admin`: `req.accessibleHotelIds = null` → queries must not filter by hotel (full access).
 * - `hotel`: `req.accessibleHotelIds = string[]` of UUIDs from `hotel_users` (may be empty).
 * All list/detail queries for hotel staff must use this array with parameterized `ANY($n::uuid[])`.
 */
async function attachHotelScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
  }

  const { role, id: userId } = req.user;

  if (role === 'police' || role === 'admin') {
    req.accessibleHotelIds = null;
    return next();
  }

  if (role === 'hotel') {
    try {
      const { rows } = await db.query(
        `SELECT hotel_id FROM hotel_users WHERE user_id = $1`,
        [userId]
      );
      req.accessibleHotelIds = rows.map((r) => String(r.hotel_id));
      return next();
    } catch (err) {
      return next(err);
    }
  }

  req.accessibleHotelIds = [];
  return next();
}

module.exports = { attachHotelScope };
