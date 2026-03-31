const db = require('../config/database');
const logger = require('./logger');

const AUDIT_ACTIONS = {
  LOGIN: 'login',
  GUEST_CREATED: 'guest_created',
  BLACKLIST_CREATED: 'blacklist_created',
  ALERT_CREATED: 'alert_created',
};

const ENTITY_TYPES = {
  USER: 'user',
  GUEST: 'guest',
  BLACKLIST: 'blacklist',
  ALERT: 'alert',
};

function getClientIp(req) {
  if (!req) return null;
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    return first || null;
  }
  if (req.ip) return req.ip;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  return null;
}

/**
 * Persists one audit row. Never throws (logs and resolves).
 * Maps to audit_logs: actor_user_id, hotel_id, action, entity_type, entity_id, metadata, ip_address, created_at.
 */
async function writeAuditLog({
  actorUserId,
  hotelId = null,
  action,
  entityType,
  entityId,
  metadata = null,
  req = null,
  ipAddress = null,
}) {
  try {
    const ip = ipAddress != null ? ipAddress : getClientIp(req);

    await db.query(
      `INSERT INTO audit_logs (actor_user_id, hotel_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7::inet)`,
      [
        actorUserId || null,
        hotelId || null,
        action,
        entityType,
        entityId,
        metadata != null ? metadata : null,
        ip || null,
      ]
    );
  } catch (err) {
    logger.error('Audit log write failed', err);
  }
}

module.exports = {
  writeAuditLog,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  getClientIp,
};
