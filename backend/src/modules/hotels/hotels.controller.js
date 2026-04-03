const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { assertHotelAccess } = require('../../utils/hotelAccess');

function mapHotelRow(row) {
  return {
    id: row.id,
    name: row.name,
    addressLine1: row.address_line1,
    city: row.city,
    country: row.country,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAllHotels(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, name, address_line1, city, country, phone, created_at, updated_at
       FROM hotels
       ORDER BY name ASC`
    );
    res.json({ success: true, data: { hotels: rows.map(mapHotelRow) } });
  } catch (err) {
    next(err);
  }
}

async function createHotel(req, res, next) {
  try {
    const { name, addressLine1, city, country, phone } = req.body;
    const { rows } = await db.query(
      `INSERT INTO hotels (name, address_line1, city, country, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, address_line1, city, country, phone, created_at, updated_at`,
      [
        name.trim(),
        addressLine1?.trim() || null,
        city?.trim() || null,
        country?.trim() || null,
        phone?.trim() || null,
      ]
    );
    res.status(201).json({ success: true, data: { hotel: mapHotelRow(rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function listHotelUsers(req, res, next) {
  try {
    const { hotelId } = req.params;
    const exists = await db.query(`SELECT 1 FROM hotels WHERE id = $1 LIMIT 1`, [hotelId]);
    if (exists.rows.length === 0) {
      next(new HttpError(404, 'Hotel not found'));
      return;
    }

    const { rows } = await db.query(
      `SELECT u.id, u.email, u.full_name, u.role, hu.created_at AS assigned_at
       FROM hotel_users hu
       INNER JOIN users u ON u.id = hu.user_id
       WHERE hu.hotel_id = $1
       ORDER BY u.email ASC`,
      [hotelId]
    );

    const users = rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      assignedAt: r.assigned_at,
    }));

    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

async function assignUserToHotel(req, res, next) {
  try {
    const { hotelId } = req.params;
    const { userId } = req.body;

    const hotelCheck = await db.query(`SELECT 1 FROM hotels WHERE id = $1 LIMIT 1`, [hotelId]);
    if (hotelCheck.rows.length === 0) {
      next(new HttpError(404, 'Hotel not found'));
      return;
    }

    const userRes = await db.query(
      `SELECT id, role FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      next(new HttpError(404, 'User not found'));
      return;
    }
    if (user.role !== 'hotel') {
      next(new HttpError(400, 'Only users with the hotel role can be assigned to a property'));
      return;
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO hotel_users (user_id, hotel_id)
         VALUES ($1, $2)
         RETURNING id, user_id, hotel_id, created_at`,
        [userId, hotelId]
      );
      res.status(201).json({
        success: true,
        data: {
          assignment: {
            id: rows[0].id,
            userId: rows[0].user_id,
            hotelId: rows[0].hotel_id,
            createdAt: rows[0].created_at,
          },
        },
      });
    } catch (err) {
      if (err.code === '23505') {
        next(new HttpError(409, 'User is already assigned to this property'));
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function listMyAssignments(req, res, next) {
  try {
    if (req.user.role !== 'hotel') {
      return res.json({ success: true, data: { hotels: [] } });
    }

    const ids = req.accessibleHotelIds;
    if (!ids || ids.length === 0) {
      return res.json({ success: true, data: { hotels: [] } });
    }

    const { rows } = await db.query(
      `SELECT h.id, h.name, h.city, h.country
       FROM hotels h
       WHERE h.id = ANY($1::uuid[])
       ORDER BY h.name ASC`,
      [ids]
    );

    res.json({ success: true, data: { hotels: rows } });
  } catch (err) {
    next(err);
  }
}

async function getHotelStats(req, res, next) {
  try {
    const { hotelId } = req.params;
    assertHotelAccess(req, hotelId);

    const [guestsRes, staysRes, alertsRes] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT g.id)::int AS c
         FROM guests g
         WHERE EXISTS (
           SELECT 1 FROM stays s WHERE s.guest_id = g.id AND s.hotel_id = $1
         )`,
        [hotelId]
      ),
      db.query(`SELECT COUNT(*)::int AS c FROM stays WHERE hotel_id = $1 AND status = 'active'`, [hotelId]),
      db.query(
        `SELECT COUNT(*)::int AS c FROM alerts WHERE hotel_id = $1 AND acknowledged_at IS NULL`,
        [hotelId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalGuests: guestsRes.rows[0].c,
        activeStays: staysRes.rows[0].c,
        pendingAlerts: alertsRes.rows[0].c,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAllHotels,
  createHotel,
  listHotelUsers,
  assignUserToHotel,
  listMyAssignments,
  getHotelStats,
};
