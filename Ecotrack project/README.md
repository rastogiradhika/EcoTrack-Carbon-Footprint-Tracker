# 🌿 EcoTrack v3 — Premium Carbon Footprint Tracker

A fully working, beautifully designed carbon footprint tracker built for India.

## 🚀 Quick Start

```bash
# 1. Install dependencies (only 2!)
pip install Flask Werkzeug

# 2. Run the app
python run.py

# 3. Open in browser
# http://127.0.0.1:5000
```

## ✨ Features

### Core
- **Emission Logging** — Transport, Food, Energy, Lifestyle with India-specific CO₂ factors
- **Sub-type Selection** — Car vs Metro vs Bus vs Train (real factors differ 12×!)
- **Receipt Upload** — Scan receipts to auto-log emissions
- **Delete Entries** — Fix mistakes anytime

### Real-World Improvements
- **India-Specific Emission Factors** — Based on IPCC 2023 + India Ministry of Environment
  - India grid: 0.716 kg CO₂/kWh (one of world's highest)
  - Metro: 0.018 kg/km vs Car: 0.171 kg/km
  - Beef: 6.61 kg CO₂/serving vs Vegetables: 0.15 kg/serving
- **Carbon Offset Tracker** — Log green actions (plant trees, cycle, LED bulbs) and see NET emissions
- **Day Streak** — Tracks consecutive days of logging
- **Delete entries** — Remove incorrect logs

### Analytics
- **Daily Trend Chart** — See emissions grouped by day
- **Category Breakdown** — Doughnut chart with dark theme
- **Net vs Gross Emissions** — Separate tracking with offsets subtracted
- **Weekly Goal Progress** — Customisable with colour-coded bar

### Social & Gamification
- **Leaderboard** — Net emissions ranking (after offsets), with avatar colours
- **9 Badges** — Milestone-based achievements with toast notifications
- **User Avatars** — Random colour assigned at registration

### AI EcoCoach
- Smart chatbot with India-specific tips
- Topics: transport, food, energy, offsets, score, badges, leaderboard, India facts
- Full chat history saved per user

## 📁 Project Structure

```
ecotrack_v3/
├── app.py              ← Flask backend (all routes + logic)
├── run.py              ← Start server
├── requirements.txt    ← Only Flask + Werkzeug needed
├── ecotrack.db         ← SQLite database (auto-created)
├── uploads/            ← Receipt uploads
├── templates/
│   ├── base.html       ← Nav + footer layout
│   ├── index.html      ← Landing page
│   ├── login.html      ← Sign in
│   ├── register.html   ← Sign up
│   └── dashboard.html  ← Main app
└── static/
    ├── css/style.css   ← Full dark design system
    └── js/main.js      ← Global JS
```

## 🛠 Tech Stack

- **Backend**: Python + Flask
- **Database**: SQLite (zero setup)
- **Frontend**: Vanilla HTML/CSS/JS + Tailwind CDN + Chart.js
- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Design**: Dark forest theme with glassmorphism cards

## 🌍 Real-World Problem Solved

Most carbon trackers use global averages. EcoTrack uses **India-specific factors**:
- India's coal-heavy grid (0.716 kg CO₂/kWh) vs global avg (0.475)
- Local transport options (auto-rickshaw, metro, train)
- Indian food context (rice-based diet baseline)

This makes the data **actually meaningful** for Indian users.
