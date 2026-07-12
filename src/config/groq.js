// src/config/groq.js
// Free, no-credit-card alternative to Gemini for receipt scanning.
// Uses Groq's OpenAI-compatible chat completions endpoint directly via
// the built-in fetch (Node 18+), so no extra npm package is required.

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

function getGroqModelName() {
  return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
}

/**
 * Sends a base64 image + text prompt to Groq's vision-capable model and
 * returns the raw text response (same shape of use as Gemini's
 * result.response.text()).
 */
async function groqExtractFromImage(base64Data, mimeType, promptText) {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getGroqModelName(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = { getGroqModelName, groqExtractFromImage };