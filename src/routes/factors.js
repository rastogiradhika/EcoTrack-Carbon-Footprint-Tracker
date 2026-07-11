// src/routes/factors.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

const { EMISSION_FACTORS } = require('../config/emissionFactors');

// GET /api/emission-factors
router.get('/', requireAuth, (req, res) => res.json(EMISSION_FACTORS));

module.exports = router;
