const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Safe health endpoint for deployment diagnostics.
// Returns booleans only (no secrets) so it's safe to enable on production.
router.get('/', (req, res) => {
  try {
    const mongoEnvSet = !!(process.env.MONGO_URI || process.env.MONGODB_URI);
    // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbState = mongoose.connection && typeof mongoose.connection.readyState === 'number'
      ? mongoose.connection.readyState
      : 0;

    res.json({
      ok: true,
      env: {
        mongoSet: mongoEnvSet,
        sessionSecretSet: !!process.env.SESSION_SECRET,
      },
      db: {
        readyState: dbState,
        connected: dbState === 1
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'health-check-failed' });
  }
});

module.exports = router;