// src/models/Offset.js
const mongoose = require('mongoose');
const { OFFSET_ACTIONS } = require('../config/constants');

const offsetSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action:     { type: String, required: true, enum: Object.keys(OFFSET_ACTIONS) },
  co2Saved:   { type: Number, required: true, min: 0 },
  dateLogged: { type: Date, default: Date.now },
}, { versionKey: false });

offsetSchema.index({ userId: 1, dateLogged: -1 });

module.exports = mongoose.model('Offset', offsetSchema);
