const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { writeAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } = require('../../utils/auditLog');
const { hashPassword, comparePassword, signToken } = require('./auth.service');

function mapPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

async function register(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body;

    const passwordHash = await hashPassword(password);

    const insert = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, created_at
    `;

    const { rows } = await db.query(insert, [email, passwordHash, fullName, role]);
    const user = rows[0];
    const token = signToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: mapPublicUser(user),
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      next(new HttpError(409, 'Email already registered'));
      return;
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const select = `
      SELECT id, email, password_hash, full_name, role, is_active, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const { rows } = await db.query(select, [email]);
    const user = rows[0];

    if (!user || !user.is_active) {
      next(new HttpError(401, 'Invalid email or password'));
      return;
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      next(new HttpError(401, 'Invalid email or password'));
      return;
    }

    const token = signToken(user);

    await writeAuditLog({
      actorUserId: user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      metadata: { email: user.email },
      req,
    });

    const { password_hash: _omit, ...rest } = user;
    res.status(200).json({
      success: true,
      data: {
        token,
        user: mapPublicUser(rest),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
};
