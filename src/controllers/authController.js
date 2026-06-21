// src/controllers/authController.js
// ─────────────────────────────────────────────
// Migrated from Flask routes:
//   POST /login    → login()
//   POST /register → register()
//   GET  /logout   → logout()  [changed to POST — security fix]
//
// Migration differences:
//   - Werkzeug generate_password_hash → bcryptjs (12 rounds)
//   - Werkzeug check_password_hash    → user.comparePassword()
//   - Flask session dict → req.session object
//   - session['user_id'], session['username'] → req.session.userId, .username
//   - SQLite IntegrityError → Mongoose duplicate key error (code 11000)
// ─────────────────────────────────────────────
const User = require('../models/User');

// POST /api/auth/register
// Flask: POST /register
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation (Flask had none — this is an improvement)
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields are required' });
    if (username.length < 3 || username.length > 30)
      return res.status(400).json({ success: false, message: 'Username must be 3–30 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const passwordHash = await User.hashPassword(password);
    await User.create({ username: username.trim(), email: email.trim().toLowerCase(), passwordHash });

    return res.json({ success: true });
  } catch (err) {
    // Mongoose duplicate key → mirrors Flask's sqlite3.IntegrityError
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ success: false, message: `${field} already exists` });
    }
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/login
// Flask: POST /login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password required' });

    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await user.comparePassword(password))) {
      // Same generic message as Flask — don't reveal which field is wrong
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Regenerate session to prevent session fixation (Flask doesn't do this)
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ success: false, message: 'Session error' });
      req.session.userId      = user._id.toString();
      req.session.username    = user.username;
      req.session.avatarColor = user.avatarColor;
      res.json({ success: true });
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/logout  (Flask was GET /logout — security fix)
const logout = (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
};

// GET /api/auth/me — new endpoint for session check (no Flask equivalent)
const me = (req, res) => {
  res.json({
    userId:      req.session.userId,
    username:    req.session.username,
    avatarColor: req.session.avatarColor,
  });
};

module.exports = { register, login, logout, me };
