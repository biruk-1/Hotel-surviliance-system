const { pool } = require('../../config/database');
const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { assertHotelAccess, isHotelInScope } = require('../../utils/hotelAccess');
const { runBlacklistCheckForNewGuest } = require('../../services/guestBlacklistCheck.service');
const { writeAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } = require('../../utils/auditLog');
const { paginationMeta } = require('../../middlewares/pagination.middleware');

const GUEST_FIELDS = `id, full_name, id_number, date_of_birth, phone, email, notes, created_at, updated_at`;

/** Guest columns with table alias (for JOIN queries). */
const GUEST_CORE = `g.id, g.full_name, g.id_number, g.date_of_birth, g.phone, g.email, g.notes, g.created_at, g.updated_at`;

/** Prefer active stay, then most recent check-in — for “where is this guest now”. */
const PRIMARY_STAY_JOIN = `
LEFT JOIN LATERAL (
  SELECT s.hotel_id, s.room_number, s.check_in, s.status
  FROM stays s
  WHERE s.guest_id = g.id
  ORDER BY (CASE WHEN s.status = 'active' THEN 0 ELSE 1 END), s.check_in DESC NULLS LAST
  LIMIT 1
) ps ON TRUE
LEFT JOIN hotels ph ON ph.id = ps.hotel_id
`;

const GUEST_LIST_SELECT = `${GUEST_CORE}, ph.name AS primary_hotel_name, ps.room_number AS primary_room_number, ps.check_in AS primary_check_in, ps.status AS primary_stay_status`;

function getNameIdSearchFromQuery(req) {
  const nameRaw = req.query.name;
  const idRaw = req.query.idNumber;
  const name = nameRaw != null && String(nameRaw).trim() !== '' ? String(nameRaw).trim() : null;
  const idNumber = idRaw != null && String(idRaw).trim() !== '' ? String(idRaw).trim() : null;
  return { name, idNumber };
}

function buildNameIdFilterSql(name, idNumber, paramStart) {
  const parts = [];
  const params = [];
  let idx = paramStart;
  if (name) {
    parts.push(`g.full_name ILIKE $${idx}`);
    params.push(`%${name}%`);
    idx += 1;
  }
  if (idNumber) {
    parts.push(`g.id_number ILIKE $${idx}`);
    params.push(`%${idNumber}%`);
    idx += 1;
  }
  const sql = parts.length ? ` AND ${parts.join(' AND ')}` : '';
  return { sql, params, nextIdx: idx };
}

function parseGuestDob(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function userCanViewGuest(role, guestId, accessibleHotelIds) {
  if (role === 'police' || role === 'admin') {
    const { rows } = await db.query(`SELECT 1 FROM guests WHERE id = $1 LIMIT 1`, [guestId]);
    return rows.length > 0;
  }
  if (role === 'hotel') {
    if (!accessibleHotelIds || accessibleHotelIds.length === 0) return false;
    const { rows } = await db.query(
      `SELECT 1
       FROM stays s
       WHERE s.guest_id = $1 AND s.hotel_id = ANY($2::uuid[])
       LIMIT 1`,
      [guestId, accessibleHotelIds]
    );
    return rows.length > 0;
  }
  return false;
}

async function createGuestWithStay(req, res, next) {
  const {
    fullName,
    idNumber,
    hotelId,
    checkIn,
    checkOut,
    roomNumber,
    phone,
    email,
    notes,
    dateOfBirth,
    status,
  } = req.body;

  // ── Phase 1: transaction — hold the dedicated pool client only for the DB writes ──
  // Releasing it immediately after COMMIT is critical for throughput under load:
  // long-running post-commit work (audit, blacklist) used to keep the client locked,
  // exhausting the pool under concurrent requests.
  let guest, stay;
  const client = await pool.connect();
  try {
    assertHotelAccess(req, hotelId);

    const hotelExists = await client.query(`SELECT 1 FROM hotels WHERE id = $1 LIMIT 1`, [hotelId]);
    if (hotelExists.rows.length === 0) throw new HttpError(404, 'Hotel not found');

    await client.query('BEGIN');

    const dob = parseGuestDob(dateOfBirth);

    const guestResult = await client.query(
      `INSERT INTO guests (full_name, id_number, date_of_birth, phone, email, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${GUEST_FIELDS}`,
      [fullName, idNumber, dob, phone || null, email || null, notes != null ? String(notes) : null]
    );
    guest = guestResult.rows[0];

    const stayResult = await client.query(
      `INSERT INTO stays (guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status, created_at, updated_at`,
      [guest.id, hotelId, req.user.id, checkIn, checkOut || null, roomNumber || null, status || 'active']
    );
    stay = stayResult.rows[0];

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    return next(err);
  }

  // Release the dedicated client right after COMMIT — back in the pool for other requests.
  client.release();

  // ── Phase 2: post-commit work — uses regular db.query (pool), no dedicated client ──

  // Audit log is fire-and-forget: it never throws and does not need to block the response.
  writeAuditLog({
    actorUserId: req.user.id,
    hotelId,
    action: AUDIT_ACTIONS.GUEST_CREATED,
    entityType: ENTITY_TYPES.GUEST,
    entityId: guest.id,
    metadata: { stayId: stay.id },
    req,
  }).catch(() => {});

  // Blacklist check is awaited so the result is included in the response.
  // It uses db.query (pool), not the dedicated transaction client.
  const blacklistCheck = await runBlacklistCheckForNewGuest({
    guest,
    stay,
    hotelId,
    userId: req.user.id,
    req,
  }).catch(() => null);

  res.status(201).json({
    success: true,
    data: {
      guest,
      stay,
      ...(blacklistCheck && { blacklistCheck }),
    },
  });
}

async function listGuests(req, res, next) {
  try {
    const { role } = req.user;
    const hotelIdFilter = req.query.hotelId;
    const { limit, offset, page } = req.pagination;

    if (role === 'police' || role === 'admin') {
      const { name, idNumber } = getNameIdSearchFromQuery(req);

      if (hotelIdFilter) {
        const { sql: searchSql, params: searchParams, nextIdx } = buildNameIdFilterSql(
          name,
          idNumber,
          2
        );
        const limitIdx = nextIdx;
        const offsetIdx = nextIdx + 1;
        const dataParams = [hotelIdFilter, ...searchParams, limit, offset];
        const countParams = [hotelIdFilter, ...searchParams];

        const [dataRes, countRes] = await Promise.all([
          db.query(
            `SELECT ${GUEST_LIST_SELECT}
             FROM guests g
             ${PRIMARY_STAY_JOIN}
             WHERE EXISTS (
               SELECT 1 FROM stays s WHERE s.guest_id = g.id AND s.hotel_id = $1
             )
             ${searchSql}
             ORDER BY g.created_at DESC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            dataParams
          ),
          db.query(
            `SELECT COUNT(*) AS total FROM guests g
             WHERE EXISTS (
               SELECT 1 FROM stays s WHERE s.guest_id = g.id AND s.hotel_id = $1
             )
             ${searchSql}`,
            countParams
          ),
        ]);
        const total = parseInt(countRes.rows[0].total, 10);
        return res.json({
          success: true,
          data: { guests: dataRes.rows, hotelId: hotelIdFilter },
          pagination: paginationMeta(total, { page, limit }),
        });
      }

      const { sql: searchSql, params: searchParams, nextIdx } = buildNameIdFilterSql(
        name,
        idNumber,
        1
      );
      const limitIdx = nextIdx;
      const offsetIdx = nextIdx + 1;
      const dataParams = [...searchParams, limit, offset];
      const countParams = [...searchParams];

      const [dataRes, countRes] = await Promise.all([
        db.query(
          `SELECT ${GUEST_LIST_SELECT}
           FROM guests g
           ${PRIMARY_STAY_JOIN}
           WHERE 1 = 1
           ${searchSql}
           ORDER BY g.created_at DESC
           LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
          dataParams
        ),
        db.query(
          `SELECT COUNT(*) AS total FROM guests g
           WHERE 1 = 1
           ${searchSql}`,
          countParams
        ),
      ]);
      const total = parseInt(countRes.rows[0].total, 10);
      return res.json({
        success: true,
        data: { guests: dataRes.rows },
        pagination: paginationMeta(total, { page, limit }),
      });
    }

    if (role === 'hotel') {
      const ids = req.accessibleHotelIds;
      if (!ids || ids.length === 0) {
        return res.json({
          success: true,
          data: { guests: [] },
          pagination: paginationMeta(0, { page, limit }),
        });
      }

      if (hotelIdFilter) {
        if (!isHotelInScope(ids, hotelIdFilter)) {
          throw new HttpError(403, 'You are not assigned to this hotel');
        }
        const [dataRes, countRes] = await Promise.all([
          db.query(
            `SELECT ${GUEST_LIST_SELECT}
             FROM guests g
             ${PRIMARY_STAY_JOIN}
             WHERE EXISTS (
               SELECT 1 FROM stays s WHERE s.guest_id = g.id AND s.hotel_id = $1
             )
             ORDER BY g.created_at DESC
             LIMIT $2 OFFSET $3`,
            [hotelIdFilter, limit, offset]
          ),
          db.query(
            `SELECT COUNT(*) AS total FROM guests g
             WHERE EXISTS (
               SELECT 1 FROM stays s WHERE s.guest_id = g.id AND s.hotel_id = $1
             )`,
            [hotelIdFilter]
          ),
        ]);
        const total = parseInt(countRes.rows[0].total, 10);
        return res.json({
          success: true,
          data: { guests: dataRes.rows, hotelId: hotelIdFilter },
          pagination: paginationMeta(total, { page, limit }),
        });
      }

      const [dataRes, countRes] = await Promise.all([
        db.query(
          `SELECT ${GUEST_LIST_SELECT}
           FROM guests g
           ${PRIMARY_STAY_JOIN}
           WHERE EXISTS (
             SELECT 1 FROM stays s
             WHERE s.guest_id = g.id AND s.hotel_id = ANY($1::uuid[])
           )
           ORDER BY g.created_at DESC
           LIMIT $2 OFFSET $3`,
          [ids, limit, offset]
        ),
        db.query(
          `SELECT COUNT(*) AS total FROM guests g
           WHERE EXISTS (
             SELECT 1 FROM stays s
             WHERE s.guest_id = g.id AND s.hotel_id = ANY($1::uuid[])
           )`,
          [ids]
        ),
      ]);
      const total = parseInt(countRes.rows[0].total, 10);
      return res.json({
        success: true,
        data: { guests: dataRes.rows },
        pagination: paginationMeta(total, { page, limit }),
      });
    }

    throw new HttpError(403, 'Insufficient permissions');
  } catch (err) {
    next(err);
  }
}

async function getGuestById(req, res, next) {
  try {
    const { id } = req.params;
    const canView = await userCanViewGuest(req.user.role, id, req.accessibleHotelIds);
    if (!canView) throw new HttpError(404, 'Guest not found');

    const guestRes = await db.query(`SELECT ${GUEST_FIELDS} FROM guests WHERE id = $1`, [id]);
    if (guestRes.rows.length === 0) throw new HttpError(404, 'Guest not found');

    let staysRes;
    if (req.user.role === 'hotel') {
      const ids = req.accessibleHotelIds;
      if (!ids || ids.length === 0) throw new HttpError(404, 'Guest not found');
      staysRes = await db.query(
        `SELECT s.id, s.hotel_id, s.created_by_user_id, s.check_in, s.check_out,
                s.room_number, s.status, s.created_at, s.updated_at,
                h.name AS hotel_name
         FROM stays s
         LEFT JOIN hotels h ON h.id = s.hotel_id
         WHERE s.guest_id = $1 AND s.hotel_id = ANY($2::uuid[])
         ORDER BY s.check_in DESC`,
        [id, ids]
      );
    } else {
      staysRes = await db.query(
        `SELECT s.id, s.hotel_id, s.created_by_user_id, s.check_in, s.check_out,
                s.room_number, s.status, s.created_at, s.updated_at,
                h.name AS hotel_name
         FROM stays s
         LEFT JOIN hotels h ON h.id = s.hotel_id
         WHERE s.guest_id = $1
         ORDER BY s.check_in DESC`,
        [id]
      );
    }

    res.json({
      success: true,
      data: {
        guest: guestRes.rows[0],
        stays: staysRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createGuestWithStay,
  listGuests,
  getGuestById,
};
