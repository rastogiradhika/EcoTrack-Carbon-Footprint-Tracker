require('dotenv').config();
const express      = require('express');
const session      = require('express-session');
const MongoStore   = require('connect-mongo').default;
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const connectDB    = require('./config/db');

const app = express();

// Respect reverse proxies (Vercel / platforms that set Forwarded/X-Forwarded headers)
// This ensures req.secure and req.ip are computed correctly.
app.set('trust proxy', 1);

// Basic sanitization for incoming forwarding headers to avoid parsing errors
// caused by malformed Forwarded headers from upstream proxies. Strip CRLFs
// and remove headers containing non-printable characters to prevent the
// 'ValidationError: The "Forwarded" header' runtime seen on Vercel.
app.use((req, _res, next) => {
  const hdrs = ['forwarded', 'x-forwarded-for', 'x-forwarded-proto'];
  for (const h of hdrs) {
    const val = req.headers[h];
    if (typeof val === 'string') {
      // Remove any CR/LF to prevent header injection and keep value printable
      const cleaned = val.replace(/[\r\n]/g, '').trim();
      // If remaining value contains control characters or suspicious chars, drop it
      if (/[^\x20-\x7E,.;=:\/\[\]\(\)"'_%@\-:\s]/.test(cleaned) || cleaned.length === 0) {
        delete req.headers[h];
      } else {
        req.headers[h] = cleaned;
      }
    }
  }
  next();
});

// ── Connect to MongoDB ──
connectDB();

// ── Security Middleware ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      // Allow Vercel live feedback script in addition to existing CDNs
      scriptSrc:     ["'self'", "'unsafe-inline'",
                      'cdn.tailwindcss.com',
                      'cdn.jsdelivr.net',
                      'cdnjs.cloudflare.com',
                      'vercel.live'],
      styleSrc:      ["'self'", "'unsafe-inline'",
                      'fonts.googleapis.com',
                      'cdn.tailwindcss.com',
                      'cdn.jsdelivr.net',
                      'cdnjs.cloudflare.com'],
      styleSrcElem:  ["'self'", "'unsafe-inline'",
                      'fonts.googleapis.com',
                      'cdn.tailwindcss.com',
                      'cdn.jsdelivr.net',
                      'cdnjs.cloudflare.com'],
      fontSrc:       ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc:        ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc:    ["'self'", 'ws:'],
      scriptSrcAttr: ["'none'"],
    },
  },
}));

// ── Rate Limiting ──
// Use a conservative key generator that prefers a sanitized X-Forwarded-For
// value (first entry), falling back to req.ip. This avoids express-rate-limit
// throwing ERR_ERL_FORWARDED_HEADER when upstream proxies set Forwarded/XFF
// headers but the module cannot safely use them by default.
function keyFromRequest(req) {
  try {
    // Prefer the RFC Forwarded header if present (e.g. "for=203.0.113.195;proto=https")
    const fwd = req.headers['forwarded'];
    if (typeof fwd === 'string' && fwd.trim().length > 0) {
      // Take the first entry and extract the `for=` token value
      const firstEntry = fwd.split(',')[0];
      const forMatch = firstEntry.match(/for=(?:"?)\[?([^\]",; ]+)\]?/i);
      if (forMatch && forMatch[1]) {
        const ip = forMatch[1].trim();
        if (ip) return ip;
      }
    }

    // Fall back to X-Forwarded-For (comma separated list, prefer first)
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim().length > 0) {
      const first = xff.split(',')[0].trim();
      if (first && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(first)) return first;
      // Accept IPv6-ish addresses and hostnames as a fallback (non-empty)
      if (first) return first;
    }
  } catch (e) {
    // ignore and fallback to req.ip
  }
  return req.ip || (req.connection && req.connection.remoteAddress) || '';
}

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             20,
  // ✅ JSON error message (reference se)
  message:         { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,   // ✅ Reference se: RateLimit-* headers
  legacyHeaders:   false,
  keyGenerator:    keyFromRequest,
});

const apiLimiter = rateLimit({
  windowMs:        1 * 60 * 1000,
  max:             120,
  message:         { success: false, message: 'Rate limit exceeded. Slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    keyFromRequest,
});

// ── General Middleware ──
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
// ✅ Reference se: production mein 'combined', dev mein 'dev'
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Session ──
const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecotrack';

app.use(session({
  secret:            process.env.SESSION_SECRET || 'change-me-in-development',
  resave:            false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl,
    ttl:        7 * 24 * 60 * 60,
    touchAfter: 24 * 3600,
  }),
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
  name: 'ecotrack.sid',
}));

// ── Static Files ──
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── favicon ──
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// ── Safe Route Loader ──
function safeRoute(routePath) {
  try {
    return require(routePath);
  } catch (err) {
    console.warn(`⚠️  Route not found: ${routePath} (${err.message})`);
    const router = express.Router();
    router.all('*', (_req, res) =>
      res.status(503).json({ success: false, message: 'Route not implemented yet' })
    );
    return router;
  }
}

// ── API Routes ──
app.use('/api/auth',             authLimiter, safeRoute('./routes/auth'));
app.use('/api/emissions',        apiLimiter,  safeRoute('./routes/emissions'));
app.use('/api',                  apiLimiter,  safeRoute('./routes/dashboard'));
app.use('/api/chat',             apiLimiter,  safeRoute('./routes/chat'));
app.use('/api/badges',           apiLimiter,  safeRoute('./routes/badges'));
app.use('/api/goals',            apiLimiter,  safeRoute('./routes/goals'));
app.use('/api/offsets',          apiLimiter,  safeRoute('./routes/offsets'));
app.use('/api/emission-factors', apiLimiter,  safeRoute('./routes/factors'));

// Lightweight health check for deployment diagnostics (no secrets returned)
app.use('/api/health', apiLimiter, safeRoute('./routes/health'));

// ── Page Routes ──
const sendPage = (page) => (req, res) => {
  const filePath = path.join(__dirname, `../public/templates/${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[PageRoute] ${page}.html not found:`, err.message);
      if (!res.headersSent)
        res.status(404).send(`<h2>Page "${page}" not found.</h2>`);
    }
  });
};

app.get('/',          sendPage('index'));
app.get('/login',     sendPage('login'));
app.get('/register',  sendPage('register'));
app.get('/dashboard', sendPage('dashboard'));

// ── Global Error Handler ──
// ✅ Reference se: Multer-specific errors handled properly
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ success: false, message: 'File too large (max 16 MB)' });
  if (err.message?.includes('Only images'))
    return res.status(415).json({ success: false, message: err.message });
  console.error('[GlobalError]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ✅ Reference se: 404 — API routes get JSON, pages get index.html
app.use((req, res) => {
  if (req.path.startsWith('/api/'))
    return res.status(404).json({ success: false, message: 'Route not found' });
  res.status(404).sendFile(path.join(__dirname, '../public/templates/index.html'));
});

// ── Server Start ──
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  // ✅ Reference se: detailed startup banner
  console.log('='.repeat(55));
  console.log('  🌿 EcoTrack — Express + MongoDB');
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`  ENV:  ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(55));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Fix: taskkill /F /PID <PID from: netstat -ano | findstr :${PORT}>`);
    process.exit(1);
  } else {
    throw err;
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled Rejection:', reason);
  // Avoid exiting in production environments (platforms like Vercel will
  // restart functions automatically and a hard exit can cause 500s for
  // unrelated requests). In development, keep the old behavior to surface
  // issues immediately.
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

module.exports = app; // ✅ Reference se: testing ke liye
