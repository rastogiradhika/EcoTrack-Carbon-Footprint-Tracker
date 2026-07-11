const path = require('path');
const fs = require('fs');
const { getGeminiClient } = require('../config/gemini');
const Emission = require('../models/Emission');
const { awardBadges } = require('../utils/emissions');
const {
  EMISSION_FACTORS,
  CATEGORY_FALLBACK_FACTORS,
} = require('../config/emissionFactors');

function resolveFactor(category, subType) {
  const catFactors = EMISSION_FACTORS[category];
  if (catFactors && subType && catFactors[subType]) {
    return { factor: catFactors[subType].factor, unit: catFactors[subType].unit };
  }
  const fallback = CATEGORY_FALLBACK_FACTORS[category] ?? 1.0;
  return { factor: fallback, unit: '' };
}

const logEmission = async (req, res) => {
  try {
    const { category, sub_type, subType, activity, amount, unit } = req.body;
    const subTypeVal = sub_type || subType || '';
    const validCategories = ['transport', 'food', 'energy', 'lifestyle'];
    if (!category || !validCategories.includes(category) || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid input or category.' });
    }
    const { factor, unit: factorUnit } = resolveFactor(category, subTypeVal);
    const co2Amount = Math.round(parseFloat(amount) * factor * 10000) / 10000;
    
    const emission = await Emission.create({
      userId: req.session.userId,
      category,
      subType: subTypeVal,
      activity: activity || category,
      amount: parseFloat(amount),
      unit: unit || factorUnit || '',
      co2Amount,
      dateLogged: new Date(),
    });

    const newBadges = await awardBadges(req.session.userId);
    res.status(201).json({ success: true, co2: co2Amount, new_badges: newBadges });
  } catch (err) {
    console.error('[logEmission]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getEmissions = async (req, res) => {
  try {
    const emissions = await Emission.find({ userId: req.session.userId }).sort({ dateLogged: -1 }).limit(50).lean();
    const mapped = emissions.map(e => ({
      id: e._id,
      category: e.category,
      sub_type: e.subType,
      activity: e.activity,
      amount: e.amount,
      unit: e.unit,
      co2_amount: e.co2Amount,
      date_logged: e.dateLogged,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteEmission = async (req, res) => {
  try {
    const id = req.body.id || req.params.id || req.query.id;
    if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing emission ID' });
    }
    const result = await Emission.deleteOne({ _id: id, userId: req.session.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Emission not found or unauthorized' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const uploadReceipt = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file.' });
    filePath = req.file.path;
    const base64Data = fs.readFileSync(filePath).toString('base64');
    
// Use this exact name
// If flash-001 fails, try this:
// Is model name format ko try karein, yeh 99% kaam karta hai
const model = getGeminiClient().getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      "Extract: category, sub_type, activity, amount, unit. Return ONLY JSON.",
      { inlineData: { data: base64Data, mimeType: req.file.mimetype } }
    ]);

    const parsed = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    const { factor, unit: factorUnit } = resolveFactor(parsed.category, parsed.sub_type);
    const co2Amount = Math.round(parseFloat(parsed.amount) * factor * 10000) / 10000;

    await Emission.create({
      userId: req.session.userId,
      category: parsed.category,
      subType: parsed.sub_type || '',
      activity: parsed.activity || 'Receipt scan',
      amount: parseFloat(parsed.amount),
      unit: parsed.unit || factorUnit || '',
      co2Amount,
      dateLogged: new Date(),
    });

    const newBadges = await awardBadges(req.session.userId);
    res.json({ success: true, item: parsed.activity, co2: co2Amount, new_badges: newBadges });
  } catch (err) {
    console.error('[uploadReceipt]', err);
    res.status(500).json({ success: false });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};

module.exports = { logEmission, getEmissions, deleteEmission, uploadReceipt };