const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { assertHotelAccess } = require('../../utils/hotelAccess');

async function createStay(req, res, next) {
  try {
    const { guestId, hotelId, checkIn, checkOut, roomNumber, status } = req.body;

    assertHotelAccess(req, hotelId);

    const guest = await db.query(`SELECT id FROM guests WHERE id = $1`, [guestId]);
    if (guest.rows.length === 0) {
      throw new HttpError(404, 'Guest not found');
    }

    const hotel = await db.query(`SELECT id FROM hotels WHERE id = $1`, [hotelId]);
    if (hotel.rows.length === 0) {
      throw new HttpError(404, 'Hotel not found');
    }

    const { rows } = await db.query(
      `INSERT INTO stays (
         guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, guest_id, hotel_id, created_by_user_id, check_in, check_out, room_number, status, created_at, updated_at`,
      [guestId, hotelId, req.user.id, checkIn, checkOut || null, roomNumber || null, status || 'active']
    );

    res.status(201).json({
      success: true,
      data: { stay: rows[0] },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStay,
};
