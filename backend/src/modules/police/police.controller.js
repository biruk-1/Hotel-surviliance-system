const db = require('../../config/database');

async function getDashboardStats(req, res, next) {
  try {
    const [guestsRes, alertsRes, blacklistRes] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS c FROM guests`),
      db.query(
        `SELECT COUNT(*)::int AS c FROM alerts
         WHERE created_at >= date_trunc('day', CURRENT_TIMESTAMP)
           AND created_at < date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day'`
      ),
      db.query(`SELECT COUNT(*)::int AS c FROM blacklist`),
    ]);

    res.json({
      success: true,
      data: {
        totalGuests: guestsRes.rows[0].c,
        alertsToday: alertsRes.rows[0].c,
        blacklistCount: blacklistRes.rows[0].c,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listHotelsForLookup(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, name, city, country
       FROM hotels
       ORDER BY name ASC`
    );
    res.json({ success: true, data: { hotels: rows } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  listHotelsForLookup,
};
