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

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, role } = req.body;

    const existing = await db.query(
      `SELECT id FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [id]
    );
    if (existing.rows.length === 0) {
      next(new HttpError(404, 'User not found'));
      return;
    }

    const setClauses = [];
    const params = [];

    if (fullName !== undefined) {
      params.push(fullName.trim());
      setClauses.push(`full_name = $${params.length}`);
    }
    if (role !== undefined) {
      params.push(role);
      setClauses.push(`role = $${params.length}`);
    }

    if (setClauses.length === 0) {
      next(new HttpError(400, 'No fields provided to update'));
      return;
    }

    params.push(id);
    const { rows } = await db.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, email, full_name, role, is_active, created_at`,
      params
    );

    res.json({ success: true, data: { user: mapPublicUser(rows[0]) } });
  } catch (err) {
    next(err);
  }
}

async function updateUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const existing = await db.query(
      `SELECT id FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [id]
    );
    if (existing.rows.length === 0) {
      next(new HttpError(404, 'User not found'));
      return;
    }

    const passwordHash = await hashPassword(password);
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, id]);

    res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // Prevent an admin from deleting their own account
    if (req.user.id === id) {
      next(new HttpError(400, 'You cannot delete your own account'));
      return;
    }

    const existing = await db.query(
      `SELECT id FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [id]
    );
    if (existing.rows.length === 0) {
      next(new HttpError(404, 'User not found'));
      return;
    }

    // Soft-delete: preserve audit trail while removing all access
    await db.query(`UPDATE users SET is_active = FALSE WHERE id = $1`, [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
};
