const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { writeAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } = require('../../utils/auditLog');

function parseDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function listAllBlacklist(req, res, next) {
  try {
    const hotelId = req.query.hotelId;

    if (hotelId) {
      const { rows } = await db.query(
        `SELECT id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id, created_at, updated_at
         FROM blacklist
         WHERE hotel_id = $1
         ORDER BY created_at DESC`,
        [hotelId]
      );
      return res.json({ success: true, data: { hotelId, entries: rows } });
    }

    const { rows } = await db.query(
      `SELECT id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id, created_at, updated_at
       FROM blacklist
       ORDER BY created_at DESC
       LIMIT 1000`
    );
    res.json({ success: true, data: { entries: rows } });
  } catch (err) {
    next(err);
  }
}

async function listBlacklistByHotel(req, res, next) {
  try {
    const hotelId = req.params.hotelId;
    const { rows } = await db.query(
      `SELECT id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id, created_at, updated_at
       FROM blacklist
       WHERE hotel_id = $1
       ORDER BY created_at DESC`,
      [hotelId]
    );
    res.json({ success: true, data: { hotelId, entries: rows } });
  } catch (err) {
    next(err);
  }
}

async function createBlacklistEntry(req, res, next) {
  try {
    const hotelId = req.params.hotelId || req.body.hotelId;
    if (!hotelId) {
      next(new HttpError(400, 'hotelId is required'));
      return;
    }

    const { name, idNumber, dateOfBirth, reason } = req.body;
    const dob = parseDateOnly(dateOfBirth);
    if (!dob) {
      next(new HttpError(400, 'dateOfBirth must be a valid date'));
      return;
    }

    const insert = `
      INSERT INTO blacklist (hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id, created_at, updated_at
    `;

    const { rows } = await db.query(insert, [
      hotelId,
      name.trim(),
      idNumber.trim(),
      dob,
      reason != null ? String(reason).trim() : null,
      req.user.id,
    ]);

    const entry = rows[0];
    await writeAuditLog({
      actorUserId: req.user.id,
      hotelId,
      action: AUDIT_ACTIONS.BLACKLIST_CREATED,
      entityType: ENTITY_TYPES.BLACKLIST,
      entityId: entry.id,
      metadata: { idNumber: entry.id_number },
      req,
    });

    res.status(201).json({ success: true, data: { entry } });
  } catch (err) {
    if (err.code === '23505') {
      next(new HttpError(409, 'This ID number is already blacklisted for this hotel'));
      return;
    }
    next(err);
  }
}

async function removeBlacklistEntry(req, res, next) {
  try {
    const { hotelId, id } = req.params;

    const { rowCount } = await db.query(
      `DELETE FROM blacklist WHERE id = $1 AND hotel_id = $2`,
      [id, hotelId]
    );

    if (rowCount === 0) {
      next(new HttpError(404, 'Blacklist entry not found'));
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllBlacklist,
  listBlacklistByHotel,
  createBlacklistEntry,
  removeBlacklistEntry,
};
