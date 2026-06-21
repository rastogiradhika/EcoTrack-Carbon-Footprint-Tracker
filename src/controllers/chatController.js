// src/controllers/chatController.js
// ─────────────────────────────────────────────
// Migrated from Flask: POST /api/chat, GET /api/chat/history
// ─────────────────────────────────────────────
const ChatMessage = require('../models/ChatMessage');
const { getChatReply, awardBadges } = require('../utils/emissions');

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const userId = req.session.userId;
    const { title, reply } = getChatReply(message.trim());

    // Save both user message and bot reply
    await ChatMessage.insertMany([
      { userId, role: 'user', message: message.trim() },
      { userId, role: 'bot',  message: reply },
    ]);

    const newBadges = await awardBadges(userId);
    res.json({ success: true, title, reply, new_badges: newBadges });
  } catch (err) {
    console.error('[sendMessage]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const rows = await ChatMessage.find({ userId: req.session.userId })
      .sort({ createdAt: 1 })
      .limit(40)
      .select('role message')
      .lean();
    res.json(rows);
  } catch (err) {
    console.error('[getChatHistory]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendMessage, getChatHistory };
