// src/controllers/dashboardController.js
// ─────────────────────────────────────────────
// Migrated from Flask: GET /api/dashboard-stats
//
// Key migration differences:
//   - SQLite GROUP BY + SUM → MongoDB $group aggregation pipeline
//   - Python datetime arithmetic → native JS Date math
//   - Streak bug from Flask is FIXED here (grace period for today)
//   - Leaderboard SQL Cartesian product bug is FIXED (separate pipelines)
// ─────────────────────────────────────────────
const Emission = require('../models/Emission');
const Offset   = require('../models/Offset');
const User     = require('../models/User');
const { BADGE_DEFS } = require('../config/constants');

// GET /api/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.session.userId;
    const now    = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel (replaces 5 sequential SQLite queries)
    const [totalResult, catResult, trendResult, offsetResult, user, weeklyResult] = await Promise.all([
      // Total CO2
      Emission.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: null, total: { $sum: '$co2Amount' } } },
      ]),
      // Category breakdown — equivalent to SQLite GROUP BY category
      Emission.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: '$category', co2: { $sum: '$co2Amount' } } },
      ]),
      // 14-day trend — GROUP BY date(date_logged) in SQLite
      Emission.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: {
            _id:  { $dateToString: { format: '%Y-%m-%d', date: '$dateLogged' } },
            co2:  { $sum: '$co2Amount' },
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 14 },
      ]),
      // Total offsets
      Offset.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: null, total: { $sum: '$co2Saved' } } },
      ]),
      // User for weeklyGoal (embedded, no separate goals table)
      User.findById(userId).select('weeklyGoal badges').lean(),
      // Weekly emissions
      Emission.aggregate([
        { $match: {
            userId: new (require('mongoose').Types.ObjectId)(userId),
            dateLogged: { $gte: sevenDaysAgo },
          }
        },
        { $group: { _id: null, total: { $sum: '$co2Amount' } } },
      ]),
    ]);

    const total      = totalResult[0]?.total  ?? 0;
    const offsets    = offsetResult[0]?.total ?? 0;
    const weekly     = weeklyResult[0]?.total ?? 0;
    const weeklyGoal = user?.weeklyGoal ?? 50.0;
    const net        = Math.max(0, Math.round((total - offsets) * 100) / 100);

    // ── Streak Calculation ─────────────────────
    // Fix for Flask bug: grace period — streak counts if user logged yesterday
    // even if they haven't logged today yet.
    const distinctDays = await Emission.aggregate([
      { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateLogged' } } } },
      { $sort: { _id: -1 } },
    ]);

    let streak = 0;
    if (distinctDays.length) {
      const today     = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today - 86400000);
      const mostRecent = new Date(distinctDays[0]._id);
      // Start from today or yesterday (grace period)
      const startFrom = mostRecent >= today ? today : yesterday;

      for (let i = 0; i < distinctDays.length; i++) {
        const expected = new Date(startFrom - i * 86400000);
        const actual   = new Date(distinctDays[i]._id);
        if (actual.getTime() === expected.getTime()) streak++;
        else break;
      }
    }

    // Eco score — log scale (fixed from Flask's linear formula that hits 0 at 1000 kg)
    const ecoScore = Math.max(0, Math.round((10 - Math.log1p(total) * 1.4) * 10) / 10);

    // Build continuous 7-day trend so Chart.js always draws a full week line graph
    const trendMap = {};
    trendResult.forEach(r => { trendMap[r._id] = Math.round(r.co2 * 100) / 100; });
    const full7DaysTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      full7DaysTrend.push({
        date: dateStr,
        co2: trendMap[dateStr] || 0
      });
    }

    res.json({
      total:       Math.round(total * 100) / 100,
      net_total:   net,
      offsets:     Math.round(offsets * 100) / 100,
      weekly:      Math.round(weekly * 100) / 100,
      weekly_goal: weeklyGoal,
      weekly_pct:  weeklyGoal ? Math.min(100, Math.round((weekly / weeklyGoal) * 1000) / 10) : 0,
      eco_score:   ecoScore,
      streak,
      categories:  catResult.map(r => ({ category: r._id, co2: Math.round(r.co2 * 100) / 100 })),
      trend:       full7DaysTrend,
    });
  } catch (err) {
    console.error('[getDashboardStats]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/recommendations — same keyword logic as Flask
const getRecommendations = async (req, res) => {
  try {
    const userId = req.session.userId;
    const rows   = await Emission.find({ userId })
      .sort({ dateLogged: -1 })
      .limit(10)
      .select('category co2Amount')
      .lean();

    if (!rows.length) {
      return res.json([{ title: 'Start Tracking', desc: 'Add your first emission to get personalised tips!', impact: 'High', icon: '🌱' }]);
    }

    const cats  = rows.map(r => r.category);
    const total = rows.reduce((s, r) => s + r.co2Amount, 0);
    const tips  = [];

    if (cats.includes('transport')) tips.push({ title: 'Use Metro or Bus',        desc: 'Switching from car to metro saves ~2.5 kg CO2/day — over 900 kg/year!',                                   impact: 'High',   icon: '🚌' });
    if (cats.includes('food'))      tips.push({ title: 'Go Veg 3 Days/Week',      desc: 'Skipping meat 3 days/week saves ~200 kg CO2/year. Rice+dal has 40× less footprint than beef.',           impact: 'High',   icon: '🥗' });
    if (cats.includes('energy'))    tips.push({ title: '5-Star Rated Appliances', desc: "A 5-star AC uses 30% less power. India's grid emits 0.716 kg CO2/kWh — every kWh saved matters.",      impact: 'Medium', icon: '⚡' });
    if (total > 30)                 tips.push({ title: 'Try Carbon Offsetting',   desc: `You've logged ${Math.round(total * 10) / 10} kg CO2. Log a green action to offset it!`,                  impact: 'Medium', icon: '🌳' });
    tips.push(                                 { title: 'Track Daily',            desc: 'Users who log daily reduce emissions 23% faster. Awareness is the first step to change.',                 impact: 'Low',    icon: '📱' });

    res.json(tips.slice(0, 4));
  } catch (err) {
    console.error('[getRecommendations]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/leaderboard
// Flask bug fixed: Cartesian JOIN inflated totals — now uses separate pipelines
const getLeaderboard = async (req, res) => {
  try {
    const [emissionTotals, offsetTotals, users] = await Promise.all([
      Emission.aggregate([
        { $group: { _id: '$userId', total: { $sum: '$co2Amount' }, logs: { $sum: 1 } } },
      ]),
      Offset.aggregate([
        { $group: { _id: '$userId', total: { $sum: '$co2Saved' } } },
      ]),
      User.find().select('username avatarColor').lean(),
    ]);

    // Build lookup maps
    const emMap = new Map(emissionTotals.map(e => [e._id.toString(), e]));
    const ofMap = new Map(offsetTotals.map(o => [o._id.toString(), o]));

    const ranked = users.map(u => {
      const uid       = u._id.toString();
      const totalCO2  = emMap.get(uid)?.total ?? 0;
      const logs      = emMap.get(uid)?.logs ?? 0;
      const offsetted = ofMap.get(uid)?.total ?? 0;
      const net       = Math.max(0, Math.round((totalCO2 - offsetted) * 100) / 100);
      return {
        username:     u.username,
        avatar_color: u.avatarColor,
        total_co2:    Math.round(totalCO2 * 100) / 100,
        logs,
        offset_total: Math.round(offsetted * 100) / 100,
        net,
        is_you:       u.username === req.session.username,
      };
    });

    // Sort by total CO2 ascending (lower is better)
    ranked.sort((a, b) => a.total_co2 - b.total_co2);
    res.json(ranked.slice(0, 15).map((r, i) => ({ rank: i + 1, ...r })));
  } catch (err) {
    console.error('[getLeaderboard]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats, getRecommendations, getLeaderboard };
