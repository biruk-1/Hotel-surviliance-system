const db = require('../config/database');
const { writeAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } = require('../utils/auditLog');
const { emitNewAlertToPolice } = require('../socket/socket.server');

const ALERT_THRESHOLD = 70;

/**
 * Create an alert for a blacklist match (guest check-in flow).
 */
async function createBlacklistMatchAlert({
  hotelId,
  stayId,
  guestId,
  createdByUserId,
  bestScore,
  blacklistEntry,
  req,
}) {
  const title = 'Blacklist match detected';
  const message = [
    `Match score: ${bestScore}%`,
    blacklistEntry
      ? `Blacklist entry: ${blacklistEntry.full_name} (ID: ${blacklistEntry.id_number})`
      : 'Blacklist match',
    blacklistEntry?.reason ? `Reason on file: ${blacklistEntry.reason}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const { rows } = await db.query(
    `INSERT INTO alerts (
       hotel_id, stay_id, guest_id, created_by_user_id,
       severity, title, message
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, hotel_id, stay_id, guest_id, severity, title, message, created_at`,
    [
      hotelId,
      stayId,
      guestId,
      createdByUserId || null,
      'critical',
      title,
      message,
    ]
  );

  const alert = rows[0];

  await writeAuditLog({
    actorUserId: createdByUserId,
    hotelId,
    action: AUDIT_ACTIONS.ALERT_CREATED,
    entityType: ENTITY_TYPES.ALERT,
    entityId: alert.id,
    metadata: { guestId, stayId, bestScore },
    req,
  });

  emitNewAlertToPolice(alert);

  return alert;
}

module.exports = {
  createBlacklistMatchAlert,
  ALERT_THRESHOLD,
};
