// src/config/constants.js
// ─────────────────────────────────────────────
// Migrated 1:1 from Flask EMISSION_FACTORS,
// CATEGORY_FACTORS, BADGE_DEFS, OFFSET_ACTIONS
// ─────────────────────────────────────────────

const EMISSION_FACTORS = {
  // Transport (kg CO2 per km) — India-specific
  transport_car:      0.171,
  transport_bike:     0.089,
  transport_bus:      0.039,
  transport_metro:    0.018,
  transport_auto:     0.095,
  transport_flight:   0.255,
  transport_train:    0.014,
  // Food (kg CO2 per serving)
  food_beef:          6.61,
  food_chicken:       1.29,
  food_rice:          0.32,
  food_vegetables:    0.15,
  food_dairy:         0.94,
  food_eggs:          0.45,
  // Energy (kg CO2 per kWh — India grid 0.716)
  energy_electricity: 0.716,
  energy_lpg:         2.983,
  energy_coal:        2.420,
  // Lifestyle
  lifestyle_shopping: 0.5,
  lifestyle_plastic:  2.0,
  lifestyle_paper:    0.9,
};

const CATEGORY_FACTORS = {
  food:      2.5,
  transport: 0.21,
  energy:    0.716,
  lifestyle: 1.0,
};

const AVATAR_COLORS = [
  '#10b981','#3b82f6','#8b5cf6',
  '#f59e0b','#ef4444','#06b6d4','#ec4899',
];

const BADGE_DEFS = {
  first_log:      { name: 'First Step',         icon: '🌱', desc: 'Logged your first emission',           color: '#10b981' },
  ten_logs:       { name: 'Consistent Tracker',  icon: '📊', desc: 'Logged 10 emissions',                  color: '#3b82f6' },
  fifty_logs:     { name: 'Data Warrior',         icon: '⚔️', desc: 'Logged 50 emissions',                  color: '#8b5cf6' },
  green_week:     { name: 'Green Week',           icon: '🏆', desc: 'Under 30 kg CO2 in recent 7 entries', color: '#f59e0b' },
  transport_hero: { name: 'Transport Hero',       icon: '🚌', desc: '5+ transport entries logged',          color: '#06b6d4' },
  food_conscious: { name: 'Food Conscious',       icon: '🥗', desc: '5+ food entries logged',               color: '#ec4899' },
  offset_starter: { name: 'Offset Starter',       icon: '🌳', desc: 'Logged your first carbon offset',      color: '#10b981' },
  chatbot_fan:    { name: 'EcoCoach Fan',          icon: '🤖', desc: 'Asked EcoCoach 5 questions',           color: '#f59e0b' },
  low_emission:   { name: 'Low Impact Life',       icon: '💚', desc: 'Total emissions under 100 kg',         color: '#10b981' },
};

const OFFSET_ACTIONS = {
  tree:     { name: 'Plant a Tree',           co2_per_unit: 21.0, unit: 'trees'       },
  solar:    { name: 'Solar Panel (month)',    co2_per_unit: 50.0, unit: 'months'      },
  public:   { name: 'Public Transport Day',  co2_per_unit: 2.5,  unit: 'days'        },
  meatfree: { name: 'Meat-Free Day',         co2_per_unit: 1.5,  unit: 'days'        },
  cycle:    { name: 'Cycling Instead of Car',co2_per_unit: 1.7,  unit: 'days'        },
  led:      { name: 'LED Bulbs Switched',    co2_per_unit: 0.3,  unit: 'bulbs/month' },
  compost:  { name: 'Composting (month)',    co2_per_unit: 3.0,  unit: 'months'      },
  carpool:  { name: 'Carpool Day',           co2_per_unit: 1.2,  unit: 'days'        },
};

module.exports = {
  EMISSION_FACTORS,
  CATEGORY_FACTORS,
  AVATAR_COLORS,
  BADGE_DEFS,
  OFFSET_ACTIONS,
};
