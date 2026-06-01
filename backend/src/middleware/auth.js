const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠  WARNING: JWT_SECRET not set. Using insecure fallback. Set JWT_SECRET in .env for production.');
}
const JWT_SECRET_FALLBACK = JWT_SECRET || 'server-rack-layout-secret';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FALLBACK);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET_FALLBACK,
    { expiresIn: '24h' }
  );
}

module.exports = { authMiddleware, generateToken, JWT_SECRET: JWT_SECRET_FALLBACK };
