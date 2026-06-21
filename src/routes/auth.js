// src/routes/auth.js
const router = require('express').Router();
const { register, login, logout, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register  ← was POST /register
router.post('/register', register);

// POST /api/auth/login     ← was POST /login
router.post('/login', login);

// POST /api/auth/logout    ← was GET /logout (security fix: now POST)
router.post('/logout', requireAuth, logout);

// GET  /api/auth/me        ← new endpoint (no Flask equivalent)
router.get('/me', requireAuth, me);

// GET  /api/auth/session   ← public endpoint for checking session (returns 200 with user data or null)
router.get('/session', (req, res) => {
  if (req.session.userId) {
    res.json({
      user_id:      req.session.userId,
      username:     req.session.username,
      avatar_color: req.session.avatarColor,
    });
  } else {
    res.json({ user_id: null, username: null, avatar_color: null });
  }
});

module.exports = router;
