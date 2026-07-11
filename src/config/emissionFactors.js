// src/config/emissionFactors.js
// ─────────────────────────────────────────────────────────────
//  EcoTrack — Standardised Emission Factors (IPCC / DEFRA 2023)
//
//  Sources:
//    [DEFRA]  UK DEFRA/DESNZ Greenhouse Gas Conversion Factors 2023
//             https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023
//    [IPCC]   IPCC AR6 WG3 Annex III (2022) — Table 12.SM.1
//             https://www.ipcc.ch/report/ar6/wg3/
//    [CEA]    Central Electricity Authority, India — Grid Emission Factor 2023
//             https://cea.nic.in/
//    [IOCL]   Indian Oil Corporation Ltd — LPG Emission Data
//    [ICCT]   International Council on Clean Transportation — India Transport 2022
//
//  All factors are in kg CO₂e per unit (unit specified per entry).
//  CO₂e = CO₂ equivalent (includes CH₄ and N₂O where applicable).
// ─────────────────────────────────────────────────────────────

const EMISSION_FACTORS = {

  // ── TRANSPORT ─────────────────────────────────────────────
  // Unit: kg CO₂e per km (per passenger)
  // Source: DEFRA 2023 Table 3 (road) + ICCT India 2022 (India-specific corrections)
  transport: {
    car: {
      factor:      0.171,   // kg CO₂e / km  — petrol car, Indian fleet average
      unit:        'km',
      label:       '🚗 Car (Petrol/Avg)',
      source:      'DEFRA 2023 + ICCT India 2022',
      description: 'Average Indian petrol car. Includes tank-to-wheel + upstream fuel production.',
    },
    car_diesel: {
      factor:      0.163,   // kg CO₂e / km
      unit:        'km',
      label:       '🚗 Car (Diesel)',
      source:      'DEFRA 2023',
      description: 'Average diesel car, India-corrected for local fuel mix.',
    },
    bike: {
      factor:      0.089,   // kg CO₂e / km
      unit:        'km',
      label:       '🏍 Motorbike/Scooter',
      source:      'DEFRA 2023 Table 3 — motorcycle',
      description: '125cc equivalent. Includes fuel production emissions.',
    },
    bus: {
      factor:      0.039,   // kg CO₂e / km  (per passenger)
      unit:        'km',
      label:       '🚌 Bus',
      source:      'DEFRA 2023 — local bus, average occupancy',
      description: 'City bus at average occupancy (~40 passengers). One of the lowest road transport options.',
    },
    metro: {
      factor:      0.018,   // kg CO₂e / km  (per passenger)
      unit:        'km',
      label:       '🚇 Metro / Urban Rail',
      source:      'IPCC AR6 + CEA 2023 grid factor applied to kWh/km data',
      description: 'Electric metro using Indian grid (0.716 kg CO₂e/kWh). Varies by city and load.',
    },
    auto: {
      factor:      0.095,   // kg CO₂e / km
      unit:        'km',
      label:       '🛺 Auto-Rickshaw (CNG)',
      source:      'ICCT India 2022 — CNG 3-wheeler',
      description: 'CNG auto-rickshaw. Higher than bus due to smaller occupancy and less efficient engine.',
    },
    auto_petrol: {
      factor:      0.118,   // kg CO₂e / km
      unit:        'km',
      label:       '🛺 Auto-Rickshaw (Petrol)',
      source:      'ICCT India 2022',
      description: 'Older petrol auto-rickshaw. More polluting than CNG variant.',
    },
    train: {
      factor:      0.014,   // kg CO₂e / km  (per passenger)
      unit:        'km',
      label:       '🚆 Train (Indian Railways)',
      source:      'Indian Railways Sustainability Report 2022 — 0.014 kg CO₂/passenger-km',
      description: 'Indian Railways average. Electrified routes even lower. Best long-distance option.',
    },
    flight_domestic: {
      factor:      0.255,   // kg CO₂e / km  (per passenger, economy)
      unit:        'km',
      label:       '✈️ Flight (Domestic)',
      source:      'DEFRA 2023 Table 10 — domestic, economy, including radiative forcing (RFI=1.9)',
      description: 'Radiative forcing included — aircraft contrails and high-altitude NOx multiply warming ~1.9x vs CO₂ alone.',
    },
    flight_international: {
      factor:      0.195,   // kg CO₂e / km  (long-haul, per passenger, economy)
      unit:        'km',
      label:       '✈️ Flight (International)',
      source:      'DEFRA 2023 Table 10 — long-haul international, economy + RFI',
      description: 'Long-haul international economy class. Business class is ~2.9x higher per seat.',
    },
    ev_car: {
      factor:      0.082,   // kg CO₂e / km  — EV on Indian grid
      unit:        'km',
      label:       '🔋 Electric Car (Indian grid)',
      source:      'CEA 2023 grid factor (0.716 kg CO₂e/kWh) × 0.2 kWh/km efficiency',
      description: 'EV charged on average Indian coal-heavy grid. Still ~2x cleaner than petrol car.',
    },
  },

  // ── FOOD ──────────────────────────────────────────────────
  // Unit: kg CO₂e per kg of food (NOT per serving)
  // Source: IPCC AR6 WG3 Chapter 12, Table 12.SM.1 (2022)
  // Note: Per-KG basis is more accurate than per-serving (portion sizes vary).
  //       Dashboard shows "servings" but backend converts: 1 serving = approx weight in kg below.
  food: {
    beef: {
      factor:      27.0,    // kg CO₂e / kg
      unit:        'kg',
      label:       '🥩 Beef / Mutton',
      source:      'IPCC AR6 WG3 Table 12.SM.1 — ruminant meat, LCA global average',
      description: 'Highest-impact food. Ruminant livestock emit methane (CH₄) during digestion. Includes land use change.',
      serving_kg:  0.25,    // 250g per serving for conversion if needed
    },
    lamb: {
      factor:      24.0,    // kg CO₂e / kg
      unit:        'kg',
      label:       '🐑 Lamb',
      source:      'DEFRA 2023 + IPCC AR6',
      description: 'Similar to beef due to ruminant methane, slightly lower land-use impact.',
      serving_kg:  0.20,
    },
    pork: {
      factor:      7.6,     // kg CO₂e / kg
      unit:        'kg',
      label:       '🐷 Pork',
      source:      'IPCC AR6 WG3 Table 12.SM.1',
      description: 'Monogastric — lower methane than beef/lamb. Feed production dominates emissions.',
      serving_kg:  0.20,
    },
    chicken: {
      factor:      6.9,     // kg CO₂e / kg
      unit:        'kg',
      label:       '🍗 Chicken / Poultry',
      source:      'IPCC AR6 WG3 Table 12.SM.1 — poultry, global average',
      description: 'Most efficient animal protein. Feed production and manure management are main sources.',
      serving_kg:  0.15,
    },
    fish_farmed: {
      factor:      5.1,     // kg CO₂e / kg
      unit:        'kg',
      label:       '🐟 Fish (Farmed)',
      source:      'IPCC AR6 WG3 — aquaculture average',
      description: 'Farmed fish footprint varies widely by species. Salmon is higher (~6), tilapia lower (~3).',
      serving_kg:  0.15,
    },
    eggs: {
      factor:      4.5,     // kg CO₂e / kg
      unit:        'kg',
      label:       '🥚 Eggs',
      source:      'DEFRA 2023 + IPCC AR6',
      description: 'Feed production accounts for ~80% of footprint. ~2 eggs ≈ 0.1 kg.',
      serving_kg:  0.10,
    },
    dairy_milk: {
      factor:      3.2,     // kg CO₂e / litre
      unit:        'litres',
      label:       '🥛 Dairy Milk',
      source:      'IPCC AR6 WG3 Table 12.SM.1 — bovine milk, global average',
      description: 'Enteric fermentation (cow burps) is the primary source of dairy emissions.',
      serving_kg:  0.25,
    },
    dairy_cheese: {
      factor:      13.5,    // kg CO₂e / kg  (concentrated dairy)
      unit:        'kg',
      label:       '🧀 Cheese',
      source:      'DEFRA 2023 — it takes ~10L milk to make 1 kg cheese',
      description: 'High impact due to concentration. 1 kg cheese ≈ 10 kg milk equivalent.',
      serving_kg:  0.05,
    },
    rice: {
      factor:      2.7,     // kg CO₂e / kg  (includes paddy methane)
      unit:        'kg',
      label:       '🍚 Rice (Cooked)',
      source:      'IPCC AR6 WG3 — flooded paddy rice, includes CH₄ from anaerobic decomposition',
      description: 'Flooded rice paddies emit methane. Higher impact than other grains. India is a major producer.',
      serving_kg:  0.20,
    },
    wheat_bread: {
      factor:      1.4,     // kg CO₂e / kg
      unit:        'kg',
      label:       '🍞 Wheat / Bread / Roti',
      source:      'DEFRA 2023 — wheat, milled product',
      description: 'Fertiliser use for wheat is the main emission source (N₂O). Lower than rice.',
      serving_kg:  0.10,
    },
    vegetables: {
      factor:      0.5,     // kg CO₂e / kg  (mixed, Indian market-basket)
      unit:        'kg',
      label:       '🥗 Vegetables (Mixed)',
      source:      'IPCC AR6 WG3 — weighted average for South Asian vegetable basket',
      description: 'Lowest-impact food category. Local seasonal produce is even lower (avoids cold-chain).',
      serving_kg:  0.15,
    },
    legumes: {
      factor:      0.9,     // kg CO₂e / kg  (dal, lentils, chickpeas)
      unit:        'kg',
      label:       '🫘 Dal / Legumes / Pulses',
      source:      'IPCC AR6 WG3 — nitrogen-fixing crops, low synthetic fertiliser need',
      description: 'Excellent protein with low footprint. Dal is one of India\'s most climate-friendly staples.',
      serving_kg:  0.15,
    },
    fruits: {
      factor:      0.4,     // kg CO₂e / kg
      unit:        'kg',
      label:       '🍎 Fruits',
      source:      'DEFRA 2023 + IPCC AR6 — seasonal, locally grown estimate',
      description: 'Very low impact when seasonal and local. Imported tropical fruits add transport emissions.',
      serving_kg:  0.15,
    },
  },

  // ── ENERGY ────────────────────────────────────────────────
  energy: {
    electricity: {
      factor:      0.716,   // kg CO₂e / kWh  — Indian national grid
      unit:        'kWh',
      label:       '💡 Electricity (Indian Grid)',
      source:      'CEA — CO₂ Baseline Database for Indian Power Sector, Version 17 (2023)',
      description: 'India\'s grid is ~70% coal-powered. One of the highest grid emission factors globally. RE penetration improving.',
    },
    electricity_solar: {
      factor:      0.041,   // kg CO₂e / kWh  — lifecycle including panel manufacture
      unit:        'kWh',
      label:       '☀️ Solar (Rooftop/On-site)',
      source:      'IPCC AR6 WG3 Table 12.5 — solar PV lifecycle',
      description: 'Lifecycle emissions of solar panels (manufacture, install, end-of-life). ~17x cleaner than Indian grid.',
    },
    lpg: {
      factor:      2.983,   // kg CO₂e / kg LPG burned
      unit:        'kg',
      label:       '🔥 LPG (Cooking Gas)',
      source:      'DEFRA 2023 — liquefied petroleum gas, combustion + upstream (well-to-tank)',
      description: 'Includes upstream extraction and transport. Cleaner than coal/biomass for cooking. 1 cylinder ≈ 14.2 kg.',
    },
    lpg_cylinder: {
      factor:      42.36,   // kg CO₂e / cylinder (14.2 kg × 2.983)
      unit:        'cylinders',
      label:       '🔥 LPG Cylinder (14.2 kg)',
      source:      'Derived: DEFRA 2023 × 14.2 kg standard Indian cylinder weight',
      description: 'Full 14.2 kg domestic LPG cylinder. Convenience unit for Indian households.',
    },
    natural_gas: {
      factor:      2.042,   // kg CO₂e / m³
      unit:        'm³',
      label:       '⛽ Natural Gas (Piped/PNG)',
      source:      'DEFRA 2023 — natural gas, combustion + upstream',
      description: 'Piped natural gas (PNG). Cleaner than LPG per unit energy but still fossil fuel.',
    },
    coal: {
      factor:      2.420,   // kg CO₂e / kg coal
      unit:        'kg',
      label:       '⚫ Coal (Domestic / Chulha)',
      source:      'IPCC AR6 WG3 + DEFRA 2023 — bituminous coal combustion + upstream',
      description: 'Highest carbon fuel. Also releases particulates. Biomass/dung alternatives have different tradeoffs.',
    },
    biomass: {
      factor:      0.120,   // kg CO₂e / kg  — net biogenic carbon (sustainable harvest)
      unit:        'kg',
      label:       '🌿 Firewood / Biomass',
      source:      'IPCC AR6 WG3 — sustainable biomass, 120g CO₂e/kg net (biogenic cycle credit)',
      description: 'Biogenic CO₂ is re-absorbed by regrowth. Net emissions low IF sustainably sourced. Causes indoor air pollution.',
    },
    generator_diesel: {
      factor:      2.68,    // kg CO₂e / litre diesel
      unit:        'litres',
      label:       '🔌 Diesel Generator',
      source:      'DEFRA 2023 — diesel combustion + upstream',
      description: 'Common in India for power backup. Very high cost per kWh vs grid. Loud and polluting.',
    },
  },

  // ── LIFESTYLE ─────────────────────────────────────────────
  lifestyle: {
    shopping_clothes: {
      factor:      15.0,    // kg CO₂e / kg of clothing
      unit:        'kg',
      label:       '👕 Clothing (New)',
      source:      'DEFRA 2023 — clothing, cradle-to-gate LCA average',
      description: 'Fashion is ~10% of global emissions. Cotton is water-intensive; synthetic fibres are petroleum-based.',
    },
    shopping_electronics: {
      factor:      70.0,    // kg CO₂e / item (average consumer electronic)
      unit:        'items',
      label:       '📱 Electronics (Phone/Tablet)',
      source:      'IPCC AR6 + lifecycle studies — smartphone avg ~70 kg CO₂e manufacturing',
      description: 'Manufacturing dominates (>80%). Extend device life by 1 year → cuts footprint ~30%.',
    },
    plastic_bag: {
      factor:      0.033,   // kg CO₂e / bag
      unit:        'bags',
      label:       '🛍 Plastic Bags',
      source:      'DEFRA 2023 — single-use plastic bag, polyethylene',
      description: 'Low per-bag, but billions used in India annually. Reusable bag breaks even after ~10 uses.',
    },
    paper: {
      factor:      0.9,     // kg CO₂e / kg paper
      unit:        'kg',
      label:       '📄 Paper / Printing',
      source:      'DEFRA 2023 — paper, cradle-to-gate average',
      description: 'Recycled paper is ~70% lower. Office ream (500 sheets) ≈ 2.5 kg → ~2.25 kg CO₂e.',
    },
    hotel_night: {
      factor:      20.8,    // kg CO₂e / night
      unit:        'nights',
      label:       '🏨 Hotel Stay (Per Night)',
      source:      'DEFRA 2023 — hotel accommodation, average',
      description: 'Energy use (HVAC, hot water, lighting) dominates. Eco-certified hotels can be 30–50% lower.',
    },
    streaming_video: {
      factor:      0.036,   // kg CO₂e / hour  (HD streaming, Indian grid)
      unit:        'hours',
      label:       '📺 Video Streaming (HD)',
      source:      'Carbon Trust 2021 + CEA 2023 grid factor applied to device + network + data centre',
      description: 'Much lower than commonly cited — device energy dominates. 4K is ~2x higher.',
    },
  },
};

// ── CATEGORY FALLBACK FACTORS ─────────────────────────────
// Used when a sub-type is not specified.
// These are conservative averages for the category.
const CATEGORY_FALLBACK_FACTORS = {
  transport: 0.171,   // kg CO₂e / km  — defaults to car
  food:      2.7,     // kg CO₂e / kg  — defaults to rice (most common Indian staple)
  energy:    0.716,   // kg CO₂e / kWh — defaults to grid electricity
  lifestyle: 1.0,     // kg CO₂e / unit — generic
};

// ── UNIT METADATA FOR DASHBOARD ──────────────────────────
// Drives the dynamic unit label and amount input in dashboard.html
// Consumed by: GET /api/emission-factors   →   dashboard.js
const CATEGORY_UNITS = {
  transport: 'km',
  food:      'kg',
  energy:    'kWh',
  lifestyle: 'units',
};

// ── WEEKLY EMISSIONS BENCHMARKS (India-specific) ──────────
// Source: MoEFCC India's GHG Platform 2022, per-capita annual ÷ 52
const INDIA_WEEKLY_BENCHMARKS = {
  average_weekly_kg:    36.5,   // 1,900 kg CO₂e/year ÷ 52
  low_impact_weekly_kg: 19.2,   // 1,000 kg/year (eco-conscious urban Indian)
  global_avg_weekly_kg: 90.4,   // 4,700 kg global average/year ÷ 52
  paris_target_weekly:  19.2,   // ~1,000 kg/year consistent with 1.5°C pathway per person
};

module.exports = {
  EMISSION_FACTORS,
  CATEGORY_FALLBACK_FACTORS,
  CATEGORY_UNITS,
  INDIA_WEEKLY_BENCHMARKS,
};