const { verifyToken } = require('../modules/auth/auth.service');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required' },
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' },
    });
  }
}

module.exports = {
  authenticate,
};
