// src/routes/goals.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getGoal, setGoal } = require('../controllers/goalsController');

// GET  /api/goals  ← was GET  /api/goals
// POST /api/goals  ← was POST /api/goals
router.route('/').get(requireAuth, getGoal).post(requireAuth, setGoal);

module.exports = router;
