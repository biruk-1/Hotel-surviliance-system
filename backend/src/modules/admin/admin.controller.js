const db = require('../../config/database');
const HttpError = require('../../utils/httpError');
const { hashPassword } = require('../auth/auth.service');

function mapPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
    isActive: row.is_active,
  };
}

async function listUsers(req, res, next) {
  try {
    const role = req.query.role;
    const params = [];
    let where = 'WHERE is_active = TRUE';
    if (role) {
      params.push(role);
      where += ` AND role = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT 500`,
      params
    );

    res.json({ success: true, data: { users: rows.map(mapPublicUser) } });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body;
    const passwordHash = await hashPassword(password);

    const insert = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, is_active, created_at
    `;

    const { rows } = await db.query(insert, [email, passwordHash, fullName, role]);
    res.status(201).json({ success: true, data: { user: mapPublicUser(rows[0]) } });
  } catch (err) {
    if (err.code === '23505') {
      next(new HttpError(409, 'Email already registered'));
      return;
    }
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
};
