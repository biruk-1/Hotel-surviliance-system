const db = require('../config/database');
const { evaluateGuestAgainstBlacklist } = require('./matching.service');
const { createBlacklistMatchAlert, ALERT_THRESHOLD } = require('./alert.service');

/**
 * After a guest + stay are committed: check hotel blacklist and create alert if score > 70.
 * Does not throw (logs errors) so guest creation always succeeds.
 */
async function runBlacklistCheckForNewGuest({ guest, stay, hotelId, userId, req }) {
  try {
    const { rows: blacklistRows } = await db.query(
      `SELECT id, hotel_id, full_name, id_number, date_of_birth, reason
       FROM blacklist
       WHERE hotel_id = $1`,
      [hotelId]
    );

    if (blacklistRows.length === 0) return null;

    const { bestScore, bestEntry, allAboveThreshold } = evaluateGuestAgainstBlacklist(
      guest,
      blacklistRows
    );

    if (bestScore <= ALERT_THRESHOLD || !bestEntry) {
      return null;
    }

    const alert = await createBlacklistMatchAlert({
      hotelId,
      stayId: stay.id,
      guestId: guest.id,
      createdByUserId: userId,
      bestScore,
      blacklistEntry: bestEntry,
      req,
    });

    return {
      alert,
      bestScore,
      matchesAboveThreshold: allAboveThreshold.length,
    };
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error('Blacklist check failed after guest creation', err);
    return null;
  }
}

module.exports = {
  runBlacklistCheckForNewGuest,
};
