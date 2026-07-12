// src/middleware/upload.js
// ─────────────────────────────────────────────
// Replaces Flask's:
//   app.config['UPLOAD_FOLDER'] = 'uploads'
//   app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
//   secure_filename() from Werkzeug
//
// Migration improvements:
//   - UUID-prefixed filenames prevent collisions (Flask had this bug)
//   - Explicit MIME type allowlist (Flask had no type checking)
//   - 16 MB limit preserved
// ─────────────────────────────────────────────
const multer = require('multer');
const path   = require('path');
const os     = require('os');
const { randomUUID } = require('crypto');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
]);

// Vercel's filesystem is read-only except for os.tmpdir() (/tmp). Locally,
// keep writing to the existing project-relative uploads/ directory.
const UPLOAD_DIR = process.env.VERCEL ? os.tmpdir() : 'uploads/';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // userId prefix + uuid prevents both collisions and path traversal
    const safe = `${req.session.userId}_${randomUUID().slice(0, 8)}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new Error('Only images (JPEG/PNG/GIF/WebP) and PDFs are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 16) * 1024 * 1024 },
});

module.exports = { upload };