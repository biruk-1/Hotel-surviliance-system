const fs = require('fs');
const path = require('path');
const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { assertHotelAccess } = require('../../utils/hotelAccess');

function unlinkQuiet(filePath) {
  if (filePath) {
    fs.unlink(filePath, () => {});
  }
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      next(new HttpError(400, 'File is required (field name: file)'));
      return;
    }

    const stayId = req.body.stayId;
    const title = (req.body.title && String(req.body.title).trim()) || 'ID document';

    const stayRes = await db.query(`SELECT id, hotel_id FROM stays WHERE id = $1`, [stayId]);
    if (stayRes.rows.length === 0) {
      unlinkQuiet(req.file.path);
      next(new HttpError(404, 'Stay not found'));
      return;
    }

    const { hotel_id: hotelId } = stayRes.rows[0];
    await assertHotelAccess(req, hotelId);

    const relativePath = path
      .join('uploads', 'documents', req.file.filename)
      .replace(/\\/g, '/');

    const { rows } = await db.query(
      `INSERT INTO documents (stay_id, uploaded_by_user_id, title, storage_key, mime_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, stay_id, uploaded_by_user_id, title, storage_key, mime_type, created_at, updated_at`,
      [stayId, req.user.id, title, relativePath, req.file.mimetype || null]
    );

    res.status(201).json({
      success: true,
      data: {
        document: rows[0],
      },
    });
  } catch (err) {
    unlinkQuiet(req.file?.path);
    next(err);
  }
}

module.exports = {
  uploadDocument,
};
