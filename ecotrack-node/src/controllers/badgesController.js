// src/controllers/badgesController.js
const User = require('../models/User');
const { BADGE_DEFS } = require('../config/constants');

const getBadges = async (req, res) => {
  try {
    const user   = await User.findById(req.session.userId).select('badges').lean();
    const earned = new Map((user?.badges ?? []).map(b => [b.badgeKey, b.earnedAt]));
    const result = Object.entries(BADGE_DEFS).map(([key, def]) => ({
      key, earned: earned.has(key), earned_at: earned.get(key) ?? null, ...def,
    }));
    res.json(result);
  } catch (err) {
    console.error('[getBadges]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getBadges };
