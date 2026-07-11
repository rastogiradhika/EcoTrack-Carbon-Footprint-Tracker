// src/routes/emissions.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { upload }      = require('../middleware/upload');
const { 
  getEmissions, 
  logEmission,
  deleteEmission, 
  uploadReceipt,
} = require('../controllers/emissionsController');

router.route('/')
  .get(requireAuth, getEmissions)
  .post(requireAuth, logEmission)
  .delete(requireAuth, deleteEmission);

// POST /api/upload  ← was POST /upload
router.post('/upload', requireAuth, upload.single('file'), uploadReceipt);

module.exports = router;
