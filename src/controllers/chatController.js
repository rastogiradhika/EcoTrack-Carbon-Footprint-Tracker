// src/controllers/chatController.js

// ─────────────────────────────────────────────────────────────────────
// EcoTrack — Chat Controller (Google Gemini 1.5 Flash)
//
// FIXES APPLIED vs previous version:
//   1. Gemini history now strictly alternates user → model → user → model.
//      Consecutive same-role messages are skipped to prevent 404 errors.
//   2. History array is guaranteed to START with a 'user' turn.
//      A leading 'model' turn (e.g. bot welcome message) is dropped.
//   3. Removed the intermediate `apiMessages` array that used a 'content'
//      key instead of Gemini's required `parts: [{ text }]` shape.
//   4. System prompt is prepended to the user's message (Gemini has no
//      dedicated system role — this is the correct pattern).
//
// UNCHANGED:
//   - MongoDB session (req.session.userId)
//   - ChatMessage model (role + message fields)
//   - Response shape { success, title, reply, new_badges }
//   - awardBadges() call
//   - getChatHistory() — untouched
// ─────────────────────────────────────────────────────────────────────

'use strict';

const { getGeminiClient, getGeminiModelName } = require('../config/gemini');
const { callGroqFallback, getRuleBasedReply } = require('../services/aiFallbackService');
const ChatMessage             = require('../models/ChatMessage');
const Emission                = require('../models/Emission');
const { awardBadges }         = require('../utils/emissions');
const {
  EMISSION_FACTORS,
  CATEGORY_FALLBACK_FACTORS,
  INDIA_WEEKLY_BENCHMARKS,
} = require('../config/emissionFactors');

// ── Build system prompt ───────────────────────────────────────────────
// Gemini has no dedicated system role, so we prepend this to the first
// user message of each turn. Injects personal context + key KB facts.
function buildSystemPrompt(recentEmissions) {

  // ── Personal context block ────────────────────────────────────────
  let personalBlock;

  if (!recentEmissions || recentEmissions.length === 0) {
    personalBlock = `PERSONAL CONTEXT:
The user has not logged any emissions yet. This is their first interaction.
Welcome them warmly, explain what EcoCoach can do, and encourage them to log
their first activity using the "Log Emission" form on the dashboard.
Do NOT fabricate any emission data.`;
  } else {
    const totalCO2   = recentEmissions.reduce((s, e) => s + (e.co2Amount || 0), 0).toFixed(2);
    const categories = [...new Set(recentEmissions.map(e => e.category))].join(', ');
    const recentList = recentEmissions.slice(0, 10).map(e =>
      `  • [${e.category}] ${e.activity} — ${e.amount} ${e.unit || ''} → ${e.co2Amount} kg CO₂`
    ).join('\n');

    personalBlock = `PERSONAL CONTEXT (user's last ${recentEmissions.length} logged emissions):
Total CO₂ logged: ${totalCO2} kg
Categories used:  ${categories}

Recent entries:
${recentList}

India weekly average:  ${INDIA_WEEKLY_BENCHMARKS.average_weekly_kg} kg CO₂
Paris 1.5°C target:    ${INDIA_WEEKLY_BENCHMARKS.paris_target_weekly} kg CO₂/week`;
  }

  // ── Lean knowledge base block ─────────────────────────────────────
  const kbBlock = `KNOWLEDGE BASE (IPCC/DEFRA 2023 emission factors, India-specific):

Transport (kg CO₂e per km):
  car=0.171, car_diesel=0.163, bike=0.089, bus=0.039,
  metro=0.018, auto(CNG)=0.095, train=0.014,
  flight_domestic=0.255, ev_car=0.082

Food (kg CO₂e per kg):
  beef=27.0, lamb=24.0, pork=7.6, chicken=6.9,
  fish_farmed=5.1, eggs=4.5, dairy_milk=3.2/litre,
  rice=2.7, wheat/roti=1.4, vegetables=0.5, dal/legumes=0.9, fruits=0.4

Energy (kg CO₂e per unit):
  electricity(Indian grid)=0.716/kWh, solar_rooftop=0.041/kWh,
  lpg=2.983/kg, lpg_cylinder=42.36/cylinder,
  natural_gas=2.042/m³, coal=2.42/kg, diesel_generator=2.68/litre

Lifestyle (kg CO₂e per unit):
  clothing=15.0/kg, electronics(phone)=70.0/item,
  plastic_bag=0.033/bag, paper=0.9/kg,
  hotel=20.8/night, video_streaming=0.036/hour`;

  return `You are EcoCoach, a friendly and knowledgeable AI climate coach for EcoTrack, an app used by people in India.

Your role:
- Give personalised, actionable advice based on the user's ACTUAL emission data shown below.
- Use the knowledge base to calculate comparisons and suggest alternatives.
- Be encouraging, not guilt-tripping. Celebrate small wins.
- Keep responses concise (3–5 sentences or a short bullet list). Avoid walls of text.
- Always ground suggestions in Indian context (local food, transport, energy options).
- If the user asks a calculation question, show your working briefly.
- Start with a 1-line insight or greeting (never "As an AI…").
- End with one encouraging sentence.
- If no emission data exists yet, skip the insight and focus on welcoming + onboarding.

${personalBlock}

${kbBlock}`;
}

// ── Build Gemini-safe history array ──────────────────────────────────
// Gemini enforces two strict rules on the `history` param of startChat():
//   Rule 1: roles must be 'user' or 'model' (not 'assistant', not 'bot')
//   Rule 2: roles must STRICTLY ALTERNATE — no two consecutive same-role turns
//   Rule 3: the FIRST turn must be 'user'
//
// MongoDB may have consecutive bot turns or start with a bot message, so
// we enforce all three rules here before passing history to the SDK.
function buildGeminiHistory(dbMessages) {
  const history = [];
  let lastRole  = null;

  for (const m of dbMessages) {
    const role = m.role === 'bot' ? 'model' : 'user';

    // Skip consecutive same-role messages — Gemini rejects them with 400/404
    if (role === lastRole) continue;

    history.push({
      role,
      parts: [{ text: m.message }],  // Gemini requires `parts`, not `content`
    });
    lastRole = role;
  }

  // Rule 3: history must start with a 'user' turn
  // A leading 'model' entry (e.g. the welcome bubble stored in DB) causes 404
  if (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }

  return history;
}

// ── POST /api/chat ────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message required' });
    }

    const userId = req.session.userId;

    // ── 1. Fetch personal emission context ───────────────────────────
    const recentEmissions = await Emission.find({ userId })
      .sort({ dateLogged: -1 })
      .limit(20)
      .select('category subType activity amount unit co2Amount dateLogged')
      .lean();

    // ── 2. Fetch conversation history (chronological) ────────────────
    const dbHistory = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })   // oldest first — chronological for Gemini
      .limit(20)
      .select('role message')
      .lean();

    // ── 3. Convert history to Gemini-safe format ─────────────────────
    const geminiHistory = buildGeminiHistory(dbHistory);

    // ── 4. Initialise model + chat session (Hybrid free AI fallback policy) ────
    let reply = null;
    const systemPromptText = buildSystemPrompt(recentEmissions);

    try {
      const model = getGeminiClient().getGenerativeModel({ model: getGeminiModelName() });
      const chat  = model.startChat({ history: geminiHistory });
      const fullMessage = `${systemPromptText}\n\nUser: ${message.trim()}`;
      const result = await chat.sendMessage(fullMessage);
      reply  = result.response.text().trim();
    } catch (geminiErr) {
      console.warn('[sendMessage] Gemini primary failed, trying Groq fallback:', geminiErr.message);
      reply = await callGroqFallback(systemPromptText, message.trim());
    }

    if (!reply) {
      reply = getRuleBasedReply(message.trim());
    }

    // Short title derived from first sentence of reply
    const title = (reply || 'EcoCoach').split(/[.!?\n]/)[0].slice(0, 60) || 'EcoCoach';

    // ── 6. Persist both turns to MongoDB ─────────────────────────────
    await ChatMessage.insertMany([
      { userId, role: 'user', message: message.trim() },
      { userId, role: 'bot',  message: reply },
    ]);

    const newBadges = await awardBadges(userId);

    return res.json({ success: true, title, reply, new_badges: newBadges });

  } catch (err) {
    console.error('[sendMessage]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/chat/history ─────────────────────────────────────────────
// Unchanged from original — same response shape as Flask: [{ role, message }, …]
const getChatHistory = async (req, res) => {
  try {
    const rows = await ChatMessage.find({ userId: req.session.userId })
      .sort({ createdAt: 1 })
      .limit(40)
      .select('role message')
      .lean();

    return res.json(rows);
  } catch (err) {
    console.error('[getChatHistory]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendMessage, getChatHistory };
