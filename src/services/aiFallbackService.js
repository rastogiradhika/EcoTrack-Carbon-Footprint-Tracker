// src/services/aiFallbackService.js
// ─────────────────────────────────────────────────────────────
// Hybrid Free AI Fallback Service for EcoCoach Chat
// Implements:
//   1. Groq Free API Fallback (llama-3.1-8b-instant)
//   2. Rule-Based Student Guidance Engine (offline/no-key fallback)
// Per api_requirements.md Service 1 Policy
// ─────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroqFallback(systemPrompt, userMessage) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    return null;
  }
}

function getRuleBasedReply(userMessage) {
  const lower = userMessage.toLowerCase().trim();

  // Greetings (matches hi, hii, hiii, hello, hey, namaste, kaise ho, etc.)
  if (/^(h+i+|hello+|hey+|namaste|kaise ho|hola|good morning|good evening)/i.test(lower) && !lower.includes('transport') && !lower.includes('food') && !lower.includes('energy') && !lower.includes('bijli') && !lower.includes('car') && !lower.includes('carbon')) {
    return "Hello! 👋 I am your EcoCoach — an AI assistant specialized in tracking and reducing your carbon footprint in India. Ask me about your transport, food, energy, or lifestyle emissions!";
  }

  // Transport
  if (lower.includes('transport') || lower.includes('car') || lower.includes('bike') || lower.includes('commute') || lower.includes('gaadi') || lower.includes('metro') || lower.includes('bus')) {
    return "Transport makes up a large portion of daily carbon footprints in India! Switching from a petrol car (0.171 kg CO₂/km) to metro (0.018 kg CO₂/km) or cycling saves over 85% of emissions per trip.";
  }

  // Food
  if (lower.includes('food') || lower.includes('diet') || lower.includes('meat') || lower.includes('rice') || lower.includes('khana') || lower.includes('chicken') || lower.includes('milk')) {
    return "Food choices matter greatly! Replacing one meat serving with plant-based proteins or seasonal Indian vegetables saves up to 5 kg CO₂ per meal.";
  }

  // Energy / Electricity
  if (lower.includes('energy') || lower.includes('electricity') || lower.includes('ac') || lower.includes('power') || lower.includes('bijli') || lower.includes('light')) {
    return "India's grid emission factor is around 0.716 kg CO₂ per kWh. Setting your AC to 24°C instead of 18°C and switching to LED appliances reduces household electricity usage by 20-30%.";
  }

  // General sustainability / carbon
  if (lower.includes('carbon') || lower.includes('footprint') || lower.includes('emission') || lower.includes('ecotrack') || lower.includes('environment') || lower.includes('climate') || lower.includes('reduce')) {
    return "Small daily steps like using public transit, switching off unused electronics, and reducing single-use plastics make a significant compound difference to your footprint. You can log your daily activities on the Dashboard to track your progress!";
  }

  // Out-of-topic / Unrelated query redirection
  return "I am EcoCoach, specialized specifically in environmental sustainability and carbon footprint reduction! 🌱 While that's an interesting topic, I'd love to help you track or lower your carbon footprint. Try asking me about saving energy, eco-friendly transport, or sustainable food habits!";
}

module.exports = { callGroqFallback, getRuleBasedReply };
