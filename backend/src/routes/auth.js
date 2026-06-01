const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getUsers, saveUsers } = require('../services/storage');
const { generateToken, authMiddleware } = require('../middleware/auth');
const ActiveDirectory = require('activedirectory2');

const router = express.Router();

// Simple in-memory rate limiter for login
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  const entry = loginAttempts.get(ip);
  if (now - entry.firstAttempt > windowMs) {
    entry.count = 1;
    entry.firstAttempt = now;
    return next();
  }

  if (entry.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again after 15 minutes.' });
  }

  entry.count++;
  next();
}

// Initialize default admin if no users exist
async function initDefaultAdmin() {
  let users = await getUsers();
  if (users.length === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    users.push({
      id: uuidv4(),
      username: 'admin',
      passwordHash: hash,
      theme: 'dark',
      createdAt: new Date().toISOString(),
    });
    await saveUsers(users);
    console.log('Default admin account created (admin / admin123)');
  }
}
initDefaultAdmin();

// POST /api/auth/login
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Try AD authentication first if enabled
    if (process.env.AD_ENABLED === 'true') {
      const config = {
        url: process.env.AD_URL,
        baseDN: process.env.AD_BASE_DN,
        username: process.env.AD_BIND_DN,
        password: process.env.AD_BIND_PASSWORD,
      };
      const ad = new ActiveDirectory(config);
      const adUsername = username.includes('@') ? username : `${username}@${process.env.AD_USER_DOMAIN}`;

      try {
        const authenticated = await new Promise((resolve) => {
          ad.authenticate(adUsername, password, (err, auth) => {
            if (err) {
              console.log('AD Auth Error:', err.message);
              resolve(false);
            } else {
              resolve(auth);
            }
          });
        });

        if (authenticated) {
          const users = await getUsers();
          let user = users.find((u) => u.username === username);
          if (!user) {
            // Auto-provision AD user in local DB
            user = {
              id: uuidv4(),
              username,
              passwordHash: 'AD_AUTHENTICATED',
              theme: 'dark',
              createdAt: new Date().toISOString(),
            };
            users.push(user);
            await saveUsers(users);
          }
          const token = generateToken(user);
          return res.json({
            token,
            user: { id: user.id, username: user.username, theme: user.theme },
          });
        }
      } catch (adErr) {
        console.error('AD processing error:', adErr);
      }
    }

    // Fallback to local database
    const users = await getUsers();
    const user = users.find((u) => u.username === username);
    if (!user || user.passwordHash === 'AD_AUTHENTICATED') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, username: user.username, theme: user.theme },
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const users = await getUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, theme: user.theme });
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, users[userIndex].passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
    await saveUsers(users);
    res.json({ success: true });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/theme
router.put('/theme', authMiddleware, async (req, res) => {
  try {
    const { theme } = req.body;
    const validThemes = ['dark', 'light', 'cyberpunk', 'solarized'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }
    const users = await getUsers();
    const userIndex = users.findIndex((u) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    users[userIndex].theme = theme;
    await saveUsers(users);
    res.json({ success: true, theme });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
