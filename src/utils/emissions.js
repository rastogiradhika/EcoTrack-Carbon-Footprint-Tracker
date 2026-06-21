// src/utils/emissions.js
// ─────────────────────────────────────────────
// Migrated from Flask helpers:
//   calc_co2()    → calcCO2()
//   award_badges() → awardBadges()
//   get_chat_reply() → getChatReply()
//
// Key migration differences:
//   - All DB calls are now async/await Mongoose queries
//   - Badge data is embedded in User doc (not a separate table)
//     → Use $push + $addToSet to avoid duplicates
//   - No SQLite row factories; Mongoose returns plain JS objects
// ─────────────────────────────────────────────
const { EMISSION_FACTORS, CATEGORY_FACTORS, BADGE_DEFS } = require('../config/constants');
const User        = require('../models/User');
const Emission    = require('../models/Emission');
const Offset      = require('../models/Offset');
const ChatMessage = require('../models/ChatMessage');

// ── CO2 Calculation ────────────────────────────
// Flask: calc_co2(category, sub_type, amount)
const calcCO2 = (category, subType, amount) => {
  const key    = subType ? `${category}_${subType}` : category;
  const factor = EMISSION_FACTORS[key] ?? CATEGORY_FACTORS[category] ?? 1.0;
  return Math.round(parseFloat(amount) * factor * 1000) / 1000; // 3 decimal places
};

// ── Badge Award ────────────────────────────────
// Flask: award_badges(user_id) — ran 6 SQL queries
// Node:  5 Mongoose aggregations, then $push only new badges
//
// IMPORTANT MIGRATION DIFFERENCE:
//   Flask stored badges in a separate table.
//   Here badges are embedded in the User document.
//   We use a Set of existing badge keys to skip already-earned ones.
const awardBadges = async (userId) => {
  const [
    totalLogs,
    transportLogs,
    foodLogs,
    offsetCount,
    chatCount,
    totalCO2Result,
    last7Result,
    user,
  ] = await Promise.all([
    Emission.countDocuments({ userId }),
    Emission.countDocuments({ userId, category: 'transport' }),
    Emission.countDocuments({ userId, category: 'food' }),
    Offset.countDocuments({ userId }),
    ChatMessage.countDocuments({ userId, role: 'user' }),
    Emission.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$co2Amount' } } }]),
    // Last 7 entries (not last 7 days — matches Flask behaviour)
    Emission.find({ userId }).sort({ dateLogged: -1 }).limit(7).select('co2Amount'),
    User.findById(userId).select('badges'),
  ]);

  const totalCO2 = totalCO2Result[0]?.total ?? 0;
  const last7CO2 = last7Result.reduce((s, e) => s + e.co2Amount, 0);

  // Build set of already-earned badge keys
  const earnedKeys = new Set((user?.badges ?? []).map(b => b.badgeKey));

  const checks = {
    first_log:      totalLogs >= 1,
    ten_logs:       totalLogs >= 10,
    fifty_logs:     totalLogs >= 50,
    green_week:     totalLogs >= 3 && last7CO2 < 30,
    transport_hero: transportLogs >= 5,
    food_conscious: foodLogs >= 5,
    offset_starter: offsetCount >= 1,
    chatbot_fan:    chatCount >= 5,
    low_emission:   totalLogs >= 1 && totalCO2 < 100,
  };

  const newBadges = [];
  const toInsert  = [];

  for (const [key, condition] of Object.entries(checks)) {
    if (condition && !earnedKeys.has(key)) {
      const badge = { badgeKey: key, earnedAt: new Date() };
      toInsert.push(badge);
      newBadges.push({ key, ...BADGE_DEFS[key] });
    }
  }

  if (toInsert.length > 0) {
    await User.findByIdAndUpdate(userId, { $push: { badges: { $each: toInsert } } });
  }

  return newBadges;
};

// ── EcoCoach Chatbot Reply ─────────────────────
// Flask: get_chat_reply(msg) — keyword if/elif chain
// Node: same logic, identical responses, object-based for clarity
const CHAT_RULES = [
  {
    keywords: ['transport','car','bike','bus','metro','auto','train','flight','drive','commute','travel'],
    title: '🚌 Transport Tips',
    reply: "India's transport sector is the 3rd largest CO2 emitter. Key changes:\n• Metro/train: 14g CO2/km vs car at 171g/km — 12× less!\n• Switch to bus for daily commute: saves ~2.5 kg CO2/day\n• For short trips under 2 km: walk or cycle (0 emissions)\n• If driving: keep tyres inflated, avoid idling — saves 5-10% fuel",
  },
  {
    keywords: ['food','eat','meal','meat','diet','veg','chicken','rice','dairy'],
    title: '🥗 Food & Diet Tips',
    reply: "Food causes ~30% of India's household emissions:\n• Beef produces 6.6 kg CO2/serving vs vegetables at 0.15 kg — 44× more!\n• Eating vegetarian just 3 days/week saves ~200 kg CO2/year\n• Buy local produce — imported food has 50× more transport emissions\n• Reduce food waste: rotting food releases methane, a powerful greenhouse gas",
  },
  {
    keywords: ['energy','electricity','power','lpg','gas','bulb','ac','fan','kwh'],
    title: '⚡ Energy Tips',
    reply: "India's electricity grid emits 0.716 kg CO2 per kWh (one of the highest globally):\n• Replace 1 AC with a 5-star rated one: saves 300 kg CO2/year\n• Switch all bulbs to LED: saves 75% lighting energy\n• Unplug chargers & TVs on standby — they consume 5-10% of your bill\n• Use natural light and ventilation where possible",
  },
  {
    keywords: ['offset','tree','plant','compensate','neutralize'],
    title: '🌳 Carbon Offsetting',
    reply: "Carbon offsets compensate for your emissions:\n• Planting 1 tree absorbs ~21 kg CO2/year\n• Solar panel installation offsets ~600 kg CO2/year\n• Taking public transport instead of car for 1 month offsets ~75 kg CO2\n• Use the Offset Tracker panel to log your offset actions!",
  },
  {
    keywords: ['score','eco score','rating','rank','points'],
    title: '⭐ Eco Score',
    reply: "Your Eco Score (0–10) is calculated from your total logged emissions:\n• 10/10 = under 100 kg logged (excellent!)\n• Score decreases as total emissions grow\n• The average Indian emits ~1,900 kg CO2/year (~158 kg/month)\n• Aim to stay below 50 kg/week to maintain a high score",
  },
  {
    keywords: ['badge','achievement','unlock','reward','medal'],
    title: '🏆 Badges Guide',
    reply: "Earn badges by hitting milestones:\n🌱 First Step — log your first emission\n📊 Consistent Tracker — log 10 emissions\n⚔️ Data Warrior — log 50 emissions\n🏆 Green Week — stay under 30 kg in 7 entries\n🚌 Transport Hero — 5+ transport logs\n🥗 Food Conscious — 5+ food logs\n🌳 Offset Starter — log your first offset\n🤖 EcoCoach Fan — ask 5 questions\n💚 Low Impact Life — total under 100 kg",
  },
  {
    keywords: ['leaderboard','compare','others','top','position','community'],
    title: '🏅 Leaderboard',
    reply: "The leaderboard ranks all EcoTrack users by total CO2 — lower is better!\n• Your position updates live as you add entries\n• Green Week badge is awarded for staying low\n• The goal isn't to emit zero — it's to continuously improve\n• Compare yourself this week vs last week, not just vs others",
  },
  {
    keywords: ['india','indian','delhi','mumbai','bangalore','emission','average'],
    title: '🇮🇳 India Emissions Context',
    reply: "India-specific facts:\n• Average Indian: ~1.9 tonnes CO2/year (global avg: 4.7 tonnes)\n• India's grid: 0.716 kg CO2/kWh (coal-heavy)\n• Transport is fastest-growing emission source in India\n• India is 3rd largest emitter globally but 7th per capita\n• Good news: India added 175 GW of renewable energy by 2022!",
  },
  {
    keywords: ['hello','hi','hey','start','help','what can'],
    title: '👋 Welcome to EcoCoach!',
    reply: "I can help you with:\n🚌 Transport tips — how to cut travel emissions\n🥗 Food tips — diet changes that matter most\n⚡ Energy tips — reduce electricity & gas use\n🌳 Offset tips — how to compensate for emissions\n⭐ Eco Score — what your score means\n🏆 Badges — how to unlock achievements\n🇮🇳 India context — local emission facts\n\nJust type your question naturally!",
  },
];

const getChatReply = (msg) => {
  const lower = msg.toLowerCase();
  for (const rule of CHAT_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { title: rule.title, reply: rule.reply };
    }
  }
  return {
    title: '💬 EcoCoach',
    reply: "I can help with transport 🚌, food 🥗, energy ⚡, offsets 🌳, your eco score ⭐, badges 🏆, leaderboard 🏅, and India-specific emission facts 🇮🇳.\n\nTry: 'how do I reduce my food emissions?' or 'what is my eco score?'",
  };
};

module.exports = { calcCO2, awardBadges, getChatReply };
