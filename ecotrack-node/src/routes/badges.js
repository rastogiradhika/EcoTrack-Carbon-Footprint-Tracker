// src/routes/badges.js
const router = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { getBadges }    = require('../controllers/badgesController');

// GET /api/badges  ← was GET /api/badges
router.get('/', requireAuth, getBadges);

module.exports = router;
