// src/server.js
// ─────────────────────────────────────────────
// EcoTrack — Node.js + Express + MongoDB
// Entry point. Equivalent of Flask's app.py + run.py combined.
// ─────────────────────────────────────────────
require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const connectDB    = require('./config/db');

const app = express();

// ── Connect to MongoDB ─────────────────────────
connectDB();

// ── Security Middleware ────────────────────────
// helmet() sets safe HTTP headers (CSP, HSTS, etc.)
// Flask had no equivalent — this is a significant security upgrade
app.use(helmet({
 contentSecurityPolicy: {
   directives: {
     defaultSrc: ["'self'"],
     scriptSrc: ["'self'", 'cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
     styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'],
     fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
     imgSrc: ["'self'", 'data:', 'blob:'],
     connectSrc: ["'self'", 'cdn.jsdelivr.net'],
     scriptSrcAttr: ["'none'"],
   },
 },
}));

// ── Rate Limiting ──────────────────────────────
// Flask had no rate limiting — auth endpoints were fully open
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,
  message:  { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max:      120,
  message:  { success: false, message: 'Rate limit exceeded. Slow down.' },
});

// ── General Middleware ─────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5000',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Session ────────────────────────────────────
// Flask: server-side session with secret key
// Node:  express-session + connect-mongo (persists sessions in MongoDB)
// This means sessions survive server restarts — Flask's didn't by default
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_dev_secret_change_me',
  resave:            false,
  saveUninitialized: false,
  store:             MongoStore.create({
    mongoUrl:    process.env.MONGO_URI,
    ttl:         7 * 24 * 60 * 60, // 7 days
    touchAfter:  24 * 3600,        // re-save session only once per 24h
  }),
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
  name: 'ecotrack.sid',
}));

// ── Static Files & Views ───────────────────────
// Serve the same templates Flask served — no change needed for frontend
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API Routes ─────────────────────────────────
// Route mapping (Flask → Node):
//   /login, /register, /logout  → /api/auth/login, /register, /logout
//   /api/emissions              → /api/emissions  (same)
//   /upload                     → /api/emissions/upload
//   /api/dashboard-stats        → /api/dashboard-stats (same)
//   /api/recommendations        → /api/recommendations (same)
//   /api/chat                   → /api/chat (same)
//   /api/chat/history           → /api/chat/history (same)
//   /api/leaderboard            → /api/leaderboard (same)
//   /api/badges                 → /api/badges (same)
//   /api/goals                  → /api/goals (same)
//   /api/offsets                → /api/offsets (same)
//   /api/emission-factors       → /api/emission-factors (same)

app.use('/api/auth',             authLimiter, require('./routes/auth'));
app.use('/api/emissions',        apiLimiter,  require('./routes/emissions'));
app.use('/api',                  apiLimiter,  require('./routes/dashboard'));
app.use('/api/chat',             apiLimiter,  require('./routes/chat'));
app.use('/api/badges',           apiLimiter,  require('./routes/badges'));
app.use('/api/goals',            apiLimiter,  require('./routes/goals'));
app.use('/api/offsets',          apiLimiter,  require('./routes/offsets'));
app.use('/api/emission-factors', apiLimiter,  require('./routes/factors'));

// ── Page Routes ────────────────────────────────
// Flask rendered Jinja2 templates. Since templates use vanilla HTML/JS,
// they can be served as static files from public/ with minimal changes.
// Alternatively, keep Flask for views and use Node only as the API backend.
const sendPage = (page) => (req, res) =>
  res.sendFile(path.join(__dirname, `../public/templates/${page}.html`));

app.get('/',          sendPage('index'));
app.get('/login',     sendPage('login'));
app.get('/register',  sendPage('register'));
app.get('/dashboard', sendPage('dashboard'));

// ── Global Error Handler ───────────────────────
// Flask had no centralised error handling — this is an improvement
app.use((err, req, res, next) => {
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ success: false, message: 'File too large (max 16 MB)' });
  // Multer file type error
  if (err.message?.includes('Only images'))
    return res.status(415).json({ success: false, message: err.message });
  console.error('[GlobalError]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/'))
    return res.status(404).json({ success: false, message: 'Route not found' });
  res.status(404).sendFile(path.join(__dirname, '../public/templates/index.html'));
});

// ── Start Server ───────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(55));
  console.log('  🌿 EcoTrack Node.js — Express + MongoDB');
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`  ENV:  ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(55));
});

module.exports = app; // for testing
