// src/controllers/emissionsController.js
// ─────────────────────────────────────────────
// Migrated from Flask route: /api/emissions (GET, POST, DELETE)
// and /upload (POST)
//
// Migration differences:
//   - SQLite INSERT + fetchall → Mongoose .create() + .find()
//   - DELETE checks user_id ownership → userId match in Mongoose query
//   - Receipt "AI" detection: same filename keyword logic, preserved as-is
// ─────────────────────────────────────────────
const Emission  = require('../models/Emission');
const { calcCO2, awardBadges } = require('../utils/emissions');
const path = require('path');

// GET /api/emissions — last 20 entries for user
// Flask: SELECT ... FROM emissions WHERE user_id=? ORDER BY date_logged DESC LIMIT 20
const getEmissions = async (req, res) => {
  try {
    const rows = await Emission.find({ userId: req.session.userId })
      .sort({ dateLogged: -1 })
      .limit(20)
      .lean();
    
    // Transform camelCase to snake_case for frontend compatibility
    const transformed = rows.map(r => ({
      id: r._id,
      date_logged: r.dateLogged,
      category: r.category,
      activity: r.activity,
      co2_amount: r.co2Amount,
      unit: r.unit,
      amount: r.amount,
      source_type: r.sourceType,
      sub_type: r.subType,
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('[getEmissions]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/emissions
// Flask: INSERT INTO emissions (user_id,category,sub_type,activity,amount,co2_amount,unit,source_type)
const addEmission = async (req, res) => {
  try {
    const { category = 'lifestyle', sub_type: subType = '', activity = 'Activity', amount, unit = '' } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0)
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

    const co2Amount = calcCO2(category, subType, parsedAmount);

    await Emission.create({
      userId: req.session.userId,
      category,
      subType,
      activity: activity.trim(),
      amount: parsedAmount,
      co2Amount,
      unit,
      sourceType: 'manual',
    });

    const newBadges = await awardBadges(req.session.userId);
    res.json({ success: true, co2: co2Amount, new_badges: newBadges });
  } catch (err) {
    console.error('[addEmission]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/emissions
// Flask: DELETE FROM emissions WHERE id=? AND user_id=?
// Migration note: Flask used numeric id; Mongoose uses ObjectId string
const deleteEmission = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });

    // userId check prevents users from deleting each other's entries
    const result = await Emission.findOneAndDelete({ _id: id, userId: req.session.userId });
    if (!result) return res.status(404).json({ success: false, message: 'Entry not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('[deleteEmission]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /upload — receipt upload with keyword-based category detection
// Flask: same keyword matching on filename, hardcoded CO2 values
const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const fl = req.file.originalname.toLowerCase();
    let val, name, category;

    if (['food','meal','restaurant','zomato','swiggy'].some(k => fl.includes(k))) {
      val = 4.5;  name = 'Food Receipt (Scanned)';        category = 'food';
    } else if (['fuel','petrol','gas','hp','bp','iocl'].some(k => fl.includes(k))) {
      val = 12.0; name = 'Fuel Receipt (Scanned)';        category = 'transport';
    } else if (['bill','electric','power','bescom','mseb'].some(k => fl.includes(k))) {
      val = 8.5;  name = 'Electricity Bill (Scanned)';    category = 'energy';
    } else {
      val = 3.0;  name = 'Scanned Receipt';               category = 'lifestyle';
    }

    await Emission.create({
      userId: req.session.userId,
      category,
      activity: name,
      amount: 1,
      co2Amount: val,
      sourceType: 'upload',
    });

    const newBadges = await awardBadges(req.session.userId);
    res.json({ success: true, co2: val, item: name, new_badges: newBadges });
  } catch (err) {
    console.error('[uploadReceipt]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getEmissions, addEmission, deleteEmission, uploadReceipt };
