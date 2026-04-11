const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { isHotelInScope } = require('../../utils/hotelAccess');
const { MAX_LIMIT } = require('./reports.validation');

function defaultLimit(req) {
  const n = req.query.limit;
  if (n == null || n === '') return 500;
  const v = parseInt(n, 10);
  return Number.isFinite(v) ? Math.min(Math.max(v, 1), MAX_LIMIT) : 500;
}

function buildDateConditions(columnAlias, dateFrom, dateTo, values) {
  const parts = [];
  if (dateFrom) {
    values.push(dateFrom);
    parts.push(`${columnAlias} >= $${values.length}::date`);
  }
  if (dateTo) {
    values.push(dateTo);
    parts.push(`${columnAlias} < ($${values.length}::date + INTERVAL '1 day')`);
  }
  return parts;
}

async function fetchGuestRows(query, limit, req) {
  const {
    dateFrom,
    dateTo,
    hotelId,
    stayStatus,
    hotelCountry,
    hotelCity,
  } = query;

  const conditions = ['1=1'];
  const values = [];

  if (req?.user?.role === 'hotel') {
    const ids = req.accessibleHotelIds;
    if (!ids || ids.length === 0) {
      conditions.push('FALSE');
    } else if (hotelId) {
      if (!isHotelInScope(ids, hotelId)) {
        throw new HttpError(403, 'You are not assigned to this hotel');
      }
      values.push(hotelId);
      conditions.push(`s.hotel_id = $${values.length}`);
    } else {
      values.push(ids);
      conditions.push(`s.hotel_id = ANY($${values.length}::uuid[])`);
    }
  } else if (hotelId) {
    values.push(hotelId);
    conditions.push(`s.hotel_id = $${values.length}`);
  }

  buildDateConditions('s.check_in', dateFrom || null, dateTo || null, values).forEach((p) => {
    conditions.push(`(${p})`);
  });
  if (stayStatus) {
    values.push(stayStatus);
    conditions.push(`s.status = $${values.length}`);
  }
  if (hotelCountry && String(hotelCountry).trim()) {
    values.push(`%${String(hotelCountry).trim()}%`);
    conditions.push(`h.country ILIKE $${values.length}`);
  }
  if (hotelCity && String(hotelCity).trim()) {
    values.push(`%${String(hotelCity).trim()}%`);
    conditions.push(`h.city ILIKE $${values.length}`);
  }

  values.push(limit);
  const limIdx = values.length;

  const sql = `
      SELECT
        g.id AS guest_id,
        g.full_name,
        g.id_number,
        g.date_of_birth,
        g.phone,
        s.id AS stay_id,
        s.check_in,
        s.check_out,
        s.room_number,
        s.status AS stay_status,
        h.id AS hotel_id,
        h.name AS hotel_name,
        h.city AS hotel_city,
        h.country AS hotel_country
      FROM stays s
      INNER JOIN guests g ON g.id = s.guest_id
      INNER JOIN hotels h ON h.id = s.hotel_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.check_in DESC
      LIMIT $${limIdx}`;

  const { rows } = await db.query(sql, values);
  return rows;
}

async function fetchBlacklistRows(query, limit) {
  const { dateFrom, dateTo, reasonContains } = query;

  const conditions = ['1=1'];
  const values = [];

  buildDateConditions('b.created_at', dateFrom || null, dateTo || null, values).forEach((p) => {
    conditions.push(`(${p})`);
  });

  if (reasonContains && String(reasonContains).trim()) {
    values.push(`%${String(reasonContains).trim()}%`);
    conditions.push(`(b.reason ILIKE $${values.length})`);
  }

  values.push(limit);
  const limIdx = values.length;

  const sql = `
      SELECT
        b.id,
        b.full_name,
        b.id_number,
        b.date_of_birth,
        b.phone,
        b.checkout_date,
        b.reason,
        b.created_at,
        h.name AS linked_hotel_name
      FROM blacklist b
      LEFT JOIN hotels h ON h.id = b.hotel_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.created_at DESC
      LIMIT $${limIdx}`;

  const { rows } = await db.query(sql, values);
  return rows;
}

async function fetchAlertRows(query, limit) {
  const { dateFrom, dateTo, hotelId, severity, titleContains } = query;

  const conditions = ['1=1'];
  const values = [];

  buildDateConditions('a.created_at', dateFrom || null, dateTo || null, values).forEach((p) => {
    conditions.push(`(${p})`);
  });

  if (hotelId) {
    values.push(hotelId);
    conditions.push(`a.hotel_id = $${values.length}`);
  }
  if (severity && String(severity).trim()) {
    values.push(String(severity).trim().toLowerCase());
    conditions.push(`LOWER(a.severity) = $${values.length}`);
  }
  if (titleContains && String(titleContains).trim()) {
    values.push(`%${String(titleContains).trim()}%`);
    conditions.push(`(a.title ILIKE $${values.length} OR a.message ILIKE $${values.length})`);
  }

  values.push(limit);
  const limIdx = values.length;

  const sql = `
      SELECT
        a.id,
        a.severity,
        a.title,
        a.message,
        a.created_at,
        a.acknowledged_at,
        h.name AS hotel_name,
        g.full_name AS guest_full_name,
        g.phone AS guest_phone,
        s.room_number AS stay_room_number,
        s.check_in AS stay_check_in,
        s.check_out AS stay_check_out
      FROM alerts a
      INNER JOIN hotels h ON h.id = a.hotel_id
      LEFT JOIN guests g ON g.id = a.guest_id
      LEFT JOIN stays s ON s.id = a.stay_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT $${limIdx}`;

  const { rows } = await db.query(sql, values);
  return rows;
}

async function reportGuests(req, res, next) {
  try {
    const {
      dateFrom,
      dateTo,
      hotelId,
      stayStatus,
      hotelCountry,
      hotelCity,
    } = req.query;
    const limit = defaultLimit(req);
    const rows = await fetchGuestRows(req.query, limit, req);

    res.json({
      success: true,
      data: {
        type: 'guests',
        rows,
        meta: {
          count: rows.length,
          limit,
          filters: {
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            hotelId: hotelId || null,
            stayStatus: stayStatus || null,
            hotelCountry: hotelCountry || null,
            hotelCity: hotelCity || null,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function reportBlacklist(req, res, next) {
  try {
    const { dateFrom, dateTo, reasonContains } = req.query;
    const limit = defaultLimit(req);
    const rows = await fetchBlacklistRows(req.query, limit);

    res.json({
      success: true,
      data: {
        type: 'blacklist',
        rows,
        meta: {
          count: rows.length,
          limit,
          filters: {
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            reasonContains: reasonContains || null,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function reportAlerts(req, res, next) {
  try {
    const { dateFrom, dateTo, hotelId, severity, titleContains } = req.query;
    const limit = defaultLimit(req);
    const rows = await fetchAlertRows(req.query, limit);

    res.json({
      success: true,
      data: {
        type: 'alerts',
        rows,
        meta: {
          count: rows.length,
          limit,
          filters: {
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            hotelId: hotelId || null,
            severity: severity || null,
            titleContains: titleContains || null,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function reportCombined(req, res, next) {
  try {
    const {
      dateFrom,
      dateTo,
      hotelId,
      stayStatus,
      hotelCountry,
      hotelCity,
      reasonContains,
      severity,
      titleContains,
    } = req.query;

    const cap = Math.min(defaultLimit(req), 2000);
    const [guestRows, blacklistRows, alertRows] = await Promise.all([
      fetchGuestRows(req.query, cap, req),
      fetchBlacklistRows(req.query, cap),
      fetchAlertRows(req.query, cap),
    ]);

    res.json({
      success: true,
      data: {
        type: 'combined',
        guests: {
          type: 'guests',
          rows: guestRows,
          meta: { count: guestRows.length, limit: cap },
        },
        blacklist: {
          type: 'blacklist',
          rows: blacklistRows,
          meta: { count: blacklistRows.length, limit: cap },
        },
        alerts: {
          type: 'alerts',
          rows: alertRows,
          meta: { count: alertRows.length, limit: cap },
        },
        meta: {
          generatedAt: new Date().toISOString(),
          filters: {
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            hotelId: hotelId || null,
            stayStatus: stayStatus || null,
            hotelCountry: hotelCountry || null,
            hotelCity: hotelCity || null,
            reasonContains: reasonContains || null,
            severity: severity || null,
            titleContains: titleContains || null,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  reportGuests,
  reportBlacklist,
  reportAlerts,
  reportCombined,
};
