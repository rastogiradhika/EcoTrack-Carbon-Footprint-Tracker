// src/models/User.js
// ─────────────────────────────────────────────
// Replaces SQLite `users` table.
// weeklyGoal is embedded here (was a separate `goals` table in SQLite).
// badges array is embedded (was a separate `badges` table).
// Migration note: SQLite INTEGER PK → MongoDB ObjectId (_id) auto-generated.
// ─────────────────────────────────────────────
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { AVATAR_COLORS } = require('../config/constants');

// Embedded badge sub-document (flattens the old `badges` table)
const badgeSchema = new mongoose.Schema({
  badgeKey:  { type: String, required: true },
  earnedAt:  { type: Date,   default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  avatarColor:  {
    type: String,
    default: () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  },
  city:         { type: String, default: 'India' },
  weeklyGoal:   { type: Number, default: 50.0 },   // ← was a separate `goals` table
  badges:       { type: [badgeSchema], default: [] }, // ← was a separate `badges` table
  createdAt:    { type: Date, default: Date.now },
}, {
  // Remove __v from API responses
  versionKey: false,
});

// Indexes are declared inline via `unique: true` above — no need to repeat here.

// ── Instance Methods ───────────────────────────
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// ── Static Methods ─────────────────────────────
userSchema.statics.hashPassword = async (plain) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
};

// ── toJSON transform — strip sensitive fields ──
userSchema.set('toJSON', {
  transform: (_, obj) => {
    delete obj.passwordHash;
    return obj;
  },
});

module.exports = mongoose.model('User', userSchema);
