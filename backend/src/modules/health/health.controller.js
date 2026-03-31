const db = require('../../config/database');

async function getHealth(req, res, next) {
  try {
    await db.healthCheck();
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        uptime: process.uptime(),
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    const unavailable = new Error('Database unavailable');
    unavailable.statusCode = 503;
    unavailable.cause = err;
    next(unavailable);
  }
}

module.exports = {
  getHealth,
};
