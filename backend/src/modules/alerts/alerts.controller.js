const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { userCanAccessHotel } = require('../../utils/hotelAccess');
const { paginationMeta } = require('../../middlewares/pagination.middleware');

const ALERT_FIELDS = `id, hotel_id, stay_id, guest_id, severity, title, message,
                      acknowledged_at, resolved_at, created_at, updated_at`;

async function assertAlertAccess(req, alertId) {
  const { rows } = await db.query(`SELECT hotel_id FROM alerts WHERE id = $1 LIMIT 1`, [alertId]);
  if (!rows.length) throw new HttpError(404, 'Alert not found');

  const { hotel_id: hotelId } = rows[0];
  if (req.user.role === 'police' || req.user.role === 'admin') return hotelId;

  if (req.user.role === 'hotel') {
    const ok = await userCanAccessHotel(req.user.id, req.user.role, hotelId, req.accessibleHotelIds);
    if (!ok) throw new HttpError(403, 'You cannot access this alert');
    return hotelId;
  }
  throw new HttpError(403, 'Insufficient permissions');
}

async function listAllAlerts(req, res, next) {
  try {
    const { role } = req.user;
    const { limit, offset, page } = req.pagination;

    if (role === 'police' || role === 'admin') {
      const [dataRes, countRes] = await Promise.all([
        db.query(
          `SELECT ${ALERT_FIELDS} FROM alerts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
        db.query(`SELECT COUNT(*) AS total FROM alerts`),
      ]);
      const total = parseInt(countRes.rows[0].total, 10);
      return res.json({
        success: true,
        data: { alerts: dataRes.rows },
        pagination: paginationMeta(total, { page, limit }),
      });
    }

    if (role === 'hotel') {
      const ids = req.accessibleHotelIds;
      if (!ids || ids.length === 0) {
        return res.json({
          success: true,
          data: { alerts: [] },
          pagination: paginationMeta(0, { page, limit }),
        });
      }

      const [dataRes, countRes] = await Promise.all([
        db.query(
          `SELECT ${ALERT_FIELDS}
           FROM alerts a
           WHERE a.hotel_id = ANY($1::uuid[])
           ORDER BY a.created_at DESC
           LIMIT $2 OFFSET $3`,
          [ids, limit, offset]
        ),
        db.query(`SELECT COUNT(*) AS total FROM alerts a WHERE a.hotel_id = ANY($1::uuid[])`, [ids]),
      ]);
      const total = parseInt(countRes.rows[0].total, 10);
      return res.json({
        success: true,
        data: { alerts: dataRes.rows },
        pagination: paginationMeta(total, { page, limit }),
      });
    }

    throw new HttpError(403, 'Insufficient permissions');
  } catch (err) {
    next(err);
  }
}

async function listAlertsForHotel(req, res, next) {
  try {
    const hotelId = req.hotelId;
    const { limit, offset, page } = req.pagination;
    const { role } = req.user;

    if (role === 'hotel') {
      const ids = req.accessibleHotelIds;
      if (!ids || !ids.length) {
        return res.json({
          success: true,
          data: { hotelId, alerts: [] },
          pagination: paginationMeta(0, { page, limit }),
        });
      }
    }

    const [dataRes, countRes] = await Promise.all([
      db.query(
        `SELECT ${ALERT_FIELDS}
         FROM alerts
         WHERE hotel_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [hotelId, limit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM alerts WHERE hotel_id = $1`, [hotelId]),
    ]);

    const total = parseInt(countRes.rows[0].total, 10);
    res.json({
      success: true,
      data: { hotelId, alerts: dataRes.rows },
      pagination: paginationMeta(total, { page, limit }),
    });
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
       RETURNING ${ALERT_FIELDS}`,
      [req.params.id]
    );

    res.json({ success: true, data: { alert: rows[0], reviewed: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllAlerts,
  listAlertsForHotel,
  markAlertReviewed,
};
