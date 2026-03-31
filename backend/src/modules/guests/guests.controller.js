const { pool } = require('../../config/database');
const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { userCanAccessHotel, assertHotelAccess } = require('../../utils/hotelAccess');
const { runBlacklistCheckForNewGuest } = require('../../services/guestBlacklistCheck.service');
const { writeAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } = require('../../utils/auditLog');

function parseGuestDob(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function userCanViewGuest(userId, role, guestId) {
  if (role === 'police' || role === 'admin') {
    const { rows } = await db.query(`SELECT 1 FROM guests WHERE id = $1 LIMIT 1`, [guestId]);
    return rows.length > 0;
  }
  if (role === 'hotel') {
    const { rows } = await db.query(
      `SELECT 1
       FROM stays s
       INNER JOIN hotel_users hu ON hu.hotel_id = s.hotel_id AND hu.user_id = $2
       WHERE s.guest_id = $1
       LIMIT 1`,
      [guestId, userId]
    );
    return rows.length > 0;
  }
  return false;
}

async function createGuestWithStay(req, res, next) {
  const client = await pool.connect();
  try {
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

    await assertHotelAccess(req, hotelId);

    const hotelExists = await client.query(`SELECT 1 FROM hotels WHERE id = $1`, [hotelId]);
    if (hotelExists.rows.length === 0) {
      throw new HttpError(404, 'Hotel not found');
    }

    await client.query('BEGIN');

    const dob = parseGuestDob(dateOfBirth);

    const guestResult = await client.query(
      `INSERT INTO guests (full_name, id_number, date_of_birth, phone, email, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, id_number, date_of_birth, phone, email, notes, created_at, updated_at`,
      [fullName, idNumber, dob, phone || null, email || null, notes != null ? String(notes) : null]
    );

    const guest = guestResult.rows[0];

    const stayResult = await client.query(
      `INSERT INTO stays (
         guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status, created_at, updated_at`,
      [
        guest.id,
        hotelId,
        req.user.id,
        checkIn,
        checkOut || null,
        roomNumber || null,
        status || 'active',
      ]
    );

    await client.query('COMMIT');

    const stay = stayResult.rows[0];

    await writeAuditLog({
      actorUserId: req.user.id,
      hotelId,
      action: AUDIT_ACTIONS.GUEST_CREATED,
      entityType: ENTITY_TYPES.GUEST,
      entityId: guest.id,
      metadata: { stayId: stay.id },
      req,
    });

    const blacklistCheck = await runBlacklistCheckForNewGuest({
      guest,
      stay,
      hotelId,
      userId: req.user.id,
      req,
    });

    res.status(201).json({
      success: true,
      data: {
        guest,
        stay,
        ...(blacklistCheck && { blacklistCheck }),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof HttpError) {
      next(err);
      return;
    }
    next(err);
  } finally {
    client.release();
  }
}

async function listGuests(req, res, next) {
  try {
    const { role, id: userId } = req.user;
    const hotelIdFilter = req.query.hotelId;

    if (role !== 'police' && role !== 'admin' && role !== 'hotel') {
      throw new HttpError(403, 'Insufficient permissions');
    }

    if (role === 'police' || role === 'admin') {
      if (hotelIdFilter) {
        const { rows } = await db.query(
          `SELECT DISTINCT ON (g.id) g.id, g.full_name, g.id_number, g.date_of_birth, g.phone, g.email, g.notes, g.created_at, g.updated_at
           FROM guests g
           INNER JOIN stays s ON s.guest_id = g.id
           WHERE s.hotel_id = $1
           ORDER BY g.id, g.created_at DESC
           LIMIT 500`,
          [hotelIdFilter]
        );
        return res.json({ success: true, data: { guests: rows, hotelId: hotelIdFilter } });
      }

      const { rows } = await db.query(
        `SELECT id, full_name, id_number, date_of_birth, phone, email, notes, created_at, updated_at
         FROM guests
         ORDER BY created_at DESC
         LIMIT 500`
      );
      return res.json({ success: true, data: { guests: rows } });
    }

    if (role === 'hotel') {
      if (hotelIdFilter) {
        const can = await userCanAccessHotel(userId, role, hotelIdFilter);
        if (!can) {
          throw new HttpError(403, 'You are not assigned to this hotel');
        }
        const { rows } = await db.query(
          `SELECT DISTINCT ON (g.id) g.id, g.full_name, g.id_number, g.date_of_birth, g.phone, g.email, g.notes, g.created_at, g.updated_at
           FROM guests g
           INNER JOIN stays s ON s.guest_id = g.id
           WHERE s.hotel_id = $1
           ORDER BY g.id, g.created_at DESC
           LIMIT 500`,
          [hotelIdFilter]
        );
        return res.json({ success: true, data: { guests: rows, hotelId: hotelIdFilter } });
      }

      const { rows } = await db.query(
        `SELECT DISTINCT ON (g.id) g.id, g.full_name, g.id_number, g.date_of_birth, g.phone, g.email, g.notes, g.created_at, g.updated_at
         FROM guests g
         INNER JOIN stays s ON s.guest_id = g.id
         INNER JOIN hotel_users hu ON hu.hotel_id = s.hotel_id AND hu.user_id = $1
         ORDER BY g.id, g.created_at DESC
         LIMIT 500`,
        [userId]
      );
      return res.json({ success: true, data: { guests: rows } });
    }
  } catch (err) {
    next(err);
  }
}

async function getGuestById(req, res, next) {
  try {
    const { id } = req.params;
    const canView = await userCanViewGuest(req.user.id, req.user.role, id);
    if (!canView) {
      throw new HttpError(404, 'Guest not found');
    }

    const { rows } = await db.query(
      `SELECT id, full_name, id_number, date_of_birth, phone, email, notes, created_at, updated_at
       FROM guests
       WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      throw new HttpError(404, 'Guest not found');
    }

    const staysResult = await db.query(
      `SELECT s.id, s.hotel_id, s.created_by_user_id, s.check_in, s.check_out, s.room_number, s.status,
              s.created_at, s.updated_at
       FROM stays s
       WHERE s.guest_id = $1
       ORDER BY s.check_in DESC`,
      [id]
    );

    let stays = staysResult.rows;
    if (req.user.role === 'hotel') {
      const { rows: allowedHotels } = await db.query(
        `SELECT hotel_id FROM hotel_users WHERE user_id = $1`,
        [req.user.id]
      );
      const allowed = new Set(allowedHotels.map((r) => r.hotel_id));
      stays = stays.filter((s) => allowed.has(s.hotel_id));
    }

    res.json({
      success: true,
      data: {
        guest: rows[0],
        stays,
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
