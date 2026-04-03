const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { writeAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } = require('../../utils/auditLog');
const { paginationMeta } = require('../../middlewares/pagination.middleware');

const BL_FIELDS = `id, hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id, created_at, updated_at`;

function parseDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function listAllBlacklist(req, res, next) {
  try {
    const { limit, offset, page } = req.pagination;

    const [dataRes, countRes] = await Promise.all([
      db.query(
        `SELECT ${BL_FIELDS} FROM blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM blacklist`),
    ]);
    const total = parseInt(countRes.rows[0].total, 10);
    res.json({
      success: true,
      data: { entries: dataRes.rows },
      pagination: paginationMeta(total, { page, limit }),
    });
  } catch (err) {
    next(err);
  }
}

async function listBlacklistByHotel(req, res, next) {
  try {
    const hotelId = req.params.hotelId;
    const { limit, offset, page } = req.pagination;

    const [dataRes, countRes] = await Promise.all([
      db.query(
        `SELECT ${BL_FIELDS} FROM blacklist WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [hotelId, limit, offset]
      ),
      db.query(`SELECT COUNT(*) AS total FROM blacklist WHERE hotel_id = $1`, [hotelId]),
    ]);
    const total = parseInt(countRes.rows[0].total, 10);
    res.json({
      success: true,
      data: { hotelId, entries: dataRes.rows },
      pagination: paginationMeta(total, { page, limit }),
    });
  } catch (err) {
    next(err);
  }
}

async function createBlacklistEntry(req, res, next) {
  try {
    const fromParam = req.params.hotelId;
    const fromBody = req.body?.hotelId;
    const hotelId =
      fromParam ||
      (fromBody != null && String(fromBody).trim() !== '' ? String(fromBody).trim() : null) ||
      null;

    const { name, idNumber, dateOfBirth, reason } = req.body;
    const dob = parseDateOnly(dateOfBirth);
    if (!dob) {
      next(new HttpError(400, 'dateOfBirth must be a valid date'));
      return;
    }

    const { rows } = await db.query(
      `INSERT INTO blacklist (hotel_id, full_name, id_number, date_of_birth, reason, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${BL_FIELDS}`,
      [hotelId, name.trim(), idNumber.trim(), dob, reason != null ? String(reason).trim() : null, req.user.id]
    );

    const entry = rows[0];
    await writeAuditLog({
      actorUserId: req.user.id,
      hotelId: entry.hotel_id || null,
      action: AUDIT_ACTIONS.BLACKLIST_CREATED,
      entityType: ENTITY_TYPES.BLACKLIST,
      entityId: entry.id,
      metadata: { idNumber: entry.id_number },
      req,
    });

    res.status(201).json({ success: true, data: { entry } });
  } catch (err) {
    if (err.code === '23505') {
      next(new HttpError(409, 'This ID number is already on the blacklist'));
      return;
    }
    // Old DBs: blacklist.hotel_id was NOT NULL; global entries use NULL — migration required.
    if (err.code === '23502' && /hotel_id/i.test(String(err.message || err.detail || ''))) {
      next(
        new HttpError(
          500,
          'Database needs migration 005: run `npm run migrate:blacklist` from the backend folder (or apply sql/migrations/005_blacklist_global.sql), then restart the API.'
        )
      );
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

/** DELETE /blacklist/:id — police/admin; no hotel scope required */
async function removeBlacklistEntryById(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query(`DELETE FROM blacklist WHERE id = $1`, [id]);
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
  removeBlacklistEntryById,
};
