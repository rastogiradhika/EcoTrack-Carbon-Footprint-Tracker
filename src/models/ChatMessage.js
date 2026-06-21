// src/models/ChatMessage.js
// ─────────────────────────────────────────────
// Replaces SQLite `chat_history` table.
// role enum keeps 'user' | 'bot' consistent with Flask.
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role:      { type: String, enum: ['user', 'bot'], required: true },
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

chatSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatSchema);
