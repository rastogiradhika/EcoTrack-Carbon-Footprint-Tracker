// src/routes/emissions.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { upload }      = require('../middleware/upload');
const {
  getEmissions, addEmission, deleteEmission, uploadReceipt,
} = require('../controllers/emissionsController');

// GET    /api/emissions  ← was GET  /api/emissions
// POST   /api/emissions  ← was POST /api/emissions
// DELETE /api/emissions  ← was DELETE /api/emissions
router.route('/')
  .get(requireAuth, getEmissions)
  .post(requireAuth, addEmission)
  .delete(requireAuth, deleteEmission);

// POST /api/upload  ← was POST /upload
router.post('/upload', requireAuth, upload.single('file'), uploadReceipt);

module.exports = router;
