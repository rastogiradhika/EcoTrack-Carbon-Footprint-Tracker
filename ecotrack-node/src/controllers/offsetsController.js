// src/controllers/offsetsController.js
const mongoose = require('mongoose');
const Offset   = require('../models/Offset');
const { OFFSET_ACTIONS } = require('../config/constants');
const { awardBadges }    = require('../utils/emissions');

const getOffsets = async (req, res) => {
  try {
    const userId = req.session.userId;
    const [history, totalResult] = await Promise.all([
      Offset.find({ userId }).sort({ dateLogged: -1 }).limit(10).lean(),
      Offset.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$co2Saved' } } },
      ]),
    ]);
    
    // Transform camelCase to snake_case
    const transformed = history.map(h => ({
      id: h._id,
      date_logged: h.dateLogged,
      action: h.action,
      co2_saved: h.co2Saved,
    }));
    
    res.json({
      history: transformed,
      total:   Math.round((totalResult[0]?.total ?? 0) * 100) / 100,
      actions: OFFSET_ACTIONS,
    });
  } catch (err) {
    console.error('[getOffsets]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addOffset = async (req, res) => {
  try {
    const { action, quantity = 1 } = req.body;
    if (!OFFSET_ACTIONS[action])
      return res.status(400).json({ success: false, message: 'Unknown action' });
    const qty      = parseFloat(quantity);
    const co2Saved = Math.round(OFFSET_ACTIONS[action].co2_per_unit * qty * 100) / 100;
    await Offset.create({ userId: req.session.userId, action, co2Saved });
    const newBadges = await awardBadges(req.session.userId);
    res.json({ success: true, co2_saved: co2Saved, new_badges: newBadges });
  } catch (err) {
    console.error('[addOffset]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getOffsets, addOffset };
