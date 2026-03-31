const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { userCanAccessHotel } = require('../../utils/hotelAccess');

async function assertAlertAccess(req, alertId) {
  const { rows } = await db.query('SELECT hotel_id FROM alerts WHERE id = $1', [alertId]);
  if (!rows.length) {
    throw new HttpError(404, 'Alert not found');
  }
  const hotelId = rows[0].hotel_id;
  if (req.user.role === 'police' || req.user.role === 'admin') {
    return hotelId;
  }
  if (req.user.role === 'hotel') {
    const ok = await userCanAccessHotel(req.user.id, req.user.role, hotelId);
    if (!ok) {
      throw new HttpError(403, 'You cannot access this alert');
    }
    return hotelId;
  }
  throw new HttpError(403, 'Insufficient permissions');
}

async function listAllAlerts(req, res, next) {
  try {
    const { role, id: userId } = req.user;

    if (role === 'police' || role === 'admin') {
      const { rows } = await db.query(
        `SELECT id, hotel_id, stay_id, guest_id, severity, title, message,
                acknowledged_at, resolved_at, created_at, updated_at
         FROM alerts
         ORDER BY created_at DESC
         LIMIT 500`
      );
      return res.json({ success: true, data: { alerts: rows } });
    }

    if (role === 'hotel') {
      const { rows } = await db.query(
        `SELECT a.id, a.hotel_id, a.stay_id, a.guest_id, a.severity, a.title, a.message,
                a.acknowledged_at, a.resolved_at, a.created_at, a.updated_at
         FROM alerts a
         INNER JOIN hotel_users hu ON hu.hotel_id = a.hotel_id AND hu.user_id = $1
         ORDER BY a.created_at DESC
         LIMIT 500`,
        [userId]
      );
      return res.json({ success: true, data: { alerts: rows } });
    }

    throw new HttpError(403, 'Insufficient permissions');
  } catch (err) {
    next(err);
  }
}

async function listAlertsForHotel(req, res, next) {
  try {
    const hotelId = req.hotelId;
    const { rows } = await db.query(
      `SELECT id, hotel_id, stay_id, guest_id, severity, title, message,
              acknowledged_at, resolved_at, created_at, updated_at
       FROM alerts
       WHERE hotel_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [hotelId]
    );
    res.json({ success: true, data: { hotelId, alerts: rows } });
  } catch (err) {
    next(err);
  }
}

async function markAlertReviewed(req, res, next) {
  try {
    await assertAlertAccess(req, req.params.id);

    const { rows } = await db.query(
      `UPDATE alerts
       SET acknowledged_at = COALESCE(acknowledged_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, hotel_id, stay_id, guest_id, severity, title, message,
                 acknowledged_at, resolved_at, created_at, updated_at`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        alert: rows[0],
        reviewed: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllAlerts,
  listAlertsForHotel,
  markAlertReviewed,
};
