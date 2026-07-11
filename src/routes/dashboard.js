// src/routes/dashboard.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { getDashboardStats, getRecommendations, getLeaderboard } = require('../controllers/dashboardController');

// GET /api/dashboard-stats
router.get('/dashboard-stats', requireAuth, getDashboardStats);

// GET /api/recommendations
router.get('/recommendations', requireAuth, getRecommendations);

// GET /api/leaderboard
router.get('/leaderboard', requireAuth, getLeaderboard);

module.exports = router;
