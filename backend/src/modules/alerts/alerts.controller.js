const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { userCanAccessHotel } = require('../../utils/hotelAccess');
const { paginationMeta } = require('../../middlewares/pagination.middleware');

const ALERT_LIST_SELECT = `a.id, a.hotel_id, a.stay_id, a.guest_id, a.severity, a.severity AS type, a.title, a.message,
  a.acknowledged_at, a.resolved_at, a.created_at, a.updated_at,
  (ur.read_at IS NOT NULL) AS seen,
  ur.read_at AS read_at,
  h.name AS hotel_name,
  g.full_name AS guest_full_name,
  g.phone AS guest_phone,
  s.room_number AS stay_room_number,
  s.check_in AS stay_check_in,
  s.check_out AS stay_check_out`;

const ALERT_BASE_JOINS = `
FROM alerts a
INNER JOIN hotels h ON h.id = a.hotel_id
LEFT JOIN guests g ON g.id = a.guest_id
LEFT JOIN stays s ON s.id = a.stay_id`;

/** @param {string} userIdParam e.g. '$1' */
function fromWithUserRead(userIdParam) {
  return `${ALERT_BASE_JOINS}
LEFT JOIN alert_user_reads ur ON ur.alert_id = a.id AND ur.user_id = ${userIdParam}`;
}

async function selectAlertEnrichedById(alertId, userId) {
  const { rows } = await db.query(
    `SELECT ${ALERT_LIST_SELECT}
     ${fromWithUserRead('$2')}
     WHERE a.id = $1
     LIMIT 1`,
    [alertId, userId]
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

async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;
    const { role } = req.user;

    if (role === 'police' || role === 'admin') {
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS c
         FROM alerts a
         LEFT JOIN alert_user_reads ur ON ur.alert_id = a.id AND ur.user_id = $1
         WHERE ur.alert_id IS NULL`,
        [userId]
      );
      return res.json({ success: true, data: { count: rows[0].c } });
    }

    if (role === 'hotel') {
      const hotelId = req.query.hotelId;
      if (!hotelId) throw new HttpError(400, 'hotelId is required');
      const ok = await userCanAccessHotel(req.user.id, req.user.role, hotelId, req.accessibleHotelIds);
      if (!ok) throw new HttpError(403, 'You cannot access this hotel');

      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS c
         FROM alerts a
         LEFT JOIN alert_user_reads ur ON ur.alert_id = a.id AND ur.user_id = $1
         WHERE a.hotel_id = $2 AND ur.alert_id IS NULL`,
        [userId, hotelId]
      );
      return res.json({ success: true, data: { count: rows[0].c, hotelId } });
    }

    throw new HttpError(403, 'Insufficient permissions');
  } catch (err) {
    next(err);
  }
}

async function markAlertRead(req, res, next) {
  try {
    await assertAlertAccess(req, req.params.id);

    await db.query(
      `INSERT INTO alert_user_reads (user_id, alert_id) VALUES ($1, $2)
       ON CONFLICT (user_id, alert_id) DO NOTHING`,
      [req.user.id, req.params.id]
    );

    const alert = await selectAlertEnrichedById(req.params.id, req.user.id);
    if (!alert) {
      next(new HttpError(404, 'Alert not found'));
      return;
    }

    res.json({ success: true, data: { alert, seen: true } });
  } catch (err) {
    next(err);
  }
}

async function markAllAlertsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { role } = req.user;

    if (role === 'police' || role === 'admin') {
      const result = await db.query(
        `INSERT INTO alert_user_reads (user_id, alert_id, read_at)
         SELECT $1, a.id, NOW() FROM alerts a
         WHERE NOT EXISTS (
           SELECT 1 FROM alert_user_reads ur WHERE ur.user_id = $1 AND ur.alert_id = a.id
         )`,
        [userId]
      );
      return res.json({ success: true, data: { marked: result.rowCount } });
    }

    if (role === 'hotel') {
      const hotelId = req.body?.hotelId;
      if (!hotelId) throw new HttpError(400, 'hotelId is required');
      const ok = await userCanAccessHotel(req.user.id, req.user.role, hotelId, req.accessibleHotelIds);
      if (!ok) throw new HttpError(403, 'You cannot access this hotel');

      const result = await db.query(
        `INSERT INTO alert_user_reads (user_id, alert_id, read_at)
         SELECT $1, a.id, NOW() FROM alerts a
         WHERE a.hotel_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM alert_user_reads ur WHERE ur.user_id = $1 AND ur.alert_id = a.id
         )`,
        [userId, hotelId]
      );
      return res.json({ success: true, data: { marked: result.rowCount, hotelId } });
    }

    throw new HttpError(403, 'Insufficient permissions');
  } catch (err) {
    next(err);
  }
}

async function listAllAlerts(req, res, next) {
  try {
    const { role } = req.user;
    const userId = req.user.id;
    const { limit, offset, page } = req.pagination;

    if (role === 'police' || role === 'admin') {
      const [dataRes, countRes] = await Promise.all([
        db.query(
          `SELECT ${ALERT_LIST_SELECT}
           ${fromWithUserRead('$1')}
           ORDER BY a.created_at DESC
           LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
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
           ${fromWithUserRead('$1')}
           WHERE a.hotel_id = ANY($2::uuid[])
           ORDER BY a.created_at DESC
           LIMIT $3 OFFSET $4`,
          [userId, ids, limit, offset]
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
    const userId = req.user.id;
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
         ${fromWithUserRead('$1')}
         WHERE a.hotel_id = $2
         ORDER BY a.created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, hotelId, limit, offset]
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

    const alert = await selectAlertEnrichedById(req.params.id, req.user.id);
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
  getUnreadCount,
  markAlertRead,
  markAllAlertsRead,
};
