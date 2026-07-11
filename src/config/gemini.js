const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
let genAIInstance = null;

function getGeminiClient() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

function getGeminiModelName() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

module.exports = { getGeminiClient, getGeminiModelName };
