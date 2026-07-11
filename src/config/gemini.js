// src/config/gemini.js
// ─────────────────────────────────────────────
// Singleton Google Generative AI client
// Architecture Report Tier 1 Recommendation #2
// ─────────────────────────────────────────────
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAIInstance = null;

function getGeminiClient() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY || 'fallback_dev_key';
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

module.exports = { getGeminiClient };
