// src/controllers/goalsController.js
const User = require('../models/User');

const getGoal = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('weeklyGoal').lean();
    res.json({ weekly_goal: user?.weeklyGoal ?? 50.0 });
  } catch (err) {
    console.error('[getGoal]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const setGoal = async (req, res) => {
  try {
    const weeklyGoal = parseFloat(req.body.weekly_goal ?? 50.0);
    if (isNaN(weeklyGoal) || weeklyGoal <= 0)
      return res.status(400).json({ success: false, message: 'Invalid goal value' });
    await User.findByIdAndUpdate(req.session.userId, { weeklyGoal });
    res.json({ success: true, weekly_goal: weeklyGoal });
  } catch (err) {
    console.error('[setGoal]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getGoal, setGoal };
