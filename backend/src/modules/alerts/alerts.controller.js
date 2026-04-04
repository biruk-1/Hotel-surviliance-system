const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { userCanAccessHotel } = require('../../utils/hotelAccess');
const { paginationMeta } = require('../../middlewares/pagination.middleware');

const ALERT_FIELDS = `id, hotel_id, stay_id, guest_id, severity, title, message,
                      acknowledged_at, resolved_at, created_at, updated_at`;

/** Base alert row + hotel name + guest name + stay location (for police / lists). */
const ALERT_LIST_SELECT = `a.id, a.hotel_id, a.stay_id, a.guest_id, a.severity, a.title, a.message,
  a.acknowledged_at, a.resolved_at, a.created_at, a.updated_at,
  h.name AS hotel_name,
  g.full_name AS guest_full_name,
  s.room_number AS stay_room_number,
  s.check_in AS stay_check_in`;

const ALERT_LIST_JOINS = `
FROM alerts a
INNER JOIN hotels h ON h.id = a.hotel_id
LEFT JOIN guests g ON g.id = a.guest_id
LEFT JOIN stays s ON s.id = a.stay_id
`;

async function selectAlertEnrichedById(alertId) {
  const { rows } = await db.query(
    `SELECT ${ALERT_LIST_SELECT}
     ${ALERT_LIST_JOINS}
     WHERE a.id = $1
     LIMIT 1`,
    [alertId]
  );
  return rows[0] || null;
}

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
          `SELECT ${ALERT_LIST_SELECT}
           ${ALERT_LIST_JOINS}
           ORDER BY a.created_at DESC
           LIMIT $1 OFFSET $2`,
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
          `SELECT ${ALERT_LIST_SELECT}
           ${ALERT_LIST_JOINS}
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
        `SELECT ${ALERT_LIST_SELECT}
         ${ALERT_LIST_JOINS}
         WHERE a.hotel_id = $1
         ORDER BY a.created_at DESC
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

    await db.query(
      `UPDATE alerts
       SET acknowledged_at = COALESCE(acknowledged_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    const alert = await selectAlertEnrichedById(req.params.id);
    if (!alert) {
      next(new HttpError(404, 'Alert not found'));
      return;
    }

    res.json({ success: true, data: { alert, reviewed: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllAlerts,
  listAlertsForHotel,
  markAlertReviewed,
};
