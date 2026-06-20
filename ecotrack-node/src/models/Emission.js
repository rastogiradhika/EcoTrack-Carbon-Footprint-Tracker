// src/models/Emission.js
// ─────────────────────────────────────────────
// Replaces SQLite `emissions` table.
// Migration notes:
//   - user_id (INTEGER FK) → userId (ObjectId ref)
//   - date_logged TIMESTAMP → dateLogged Date (Mongo native)
//   - sub_type TEXT → subType String
//   - co2_amount REAL → co2Amount Number
//   - source_type TEXT → sourceType String (enum)
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const emissionSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  category: {
    type:     String,
    required: true,
    enum:     ['transport', 'food', 'energy', 'lifestyle'],
  },
  subType:    { type: String, default: '' },
  activity:   { type: String, required: true, trim: true },
  amount:     { type: Number, required: true, min: 0.001 },
  co2Amount:  { type: Number, required: true },
  unit:       { type: String, default: '' },
  sourceType: { type: String, enum: ['manual', 'upload'], default: 'manual' },
  dateLogged: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

// Compound index for efficient per-user queries sorted by date
emissionSchema.index({ userId: 1, dateLogged: -1 });
emissionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Emission', emissionSchema);
