// src/routes/offsets.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getOffsets, addOffset } = require('../controllers/offsetsController');

// GET  /api/offsets  ← was GET  /api/offsets
// POST /api/offsets  ← was POST /api/offsets
router.route('/').get(requireAuth, getOffsets).post(requireAuth, addOffset);

module.exports = router;
