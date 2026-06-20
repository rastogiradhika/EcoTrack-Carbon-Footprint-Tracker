// src/routes/chat.js
const router = require('express').Router();
const { requireAuth }  = require('../middleware/auth');
const { sendMessage, getChatHistory } = require('../controllers/chatController');

// POST /api/chat          ← was POST /api/chat
router.post('/', requireAuth, sendMessage);

// GET  /api/chat/history  ← was GET /api/chat/history
router.get('/history', requireAuth, getChatHistory);

module.exports = router;
