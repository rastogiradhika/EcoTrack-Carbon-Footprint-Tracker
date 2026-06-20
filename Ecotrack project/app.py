from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os, sqlite3, json
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = 'ecotrack_v3_ultra_secret_2026'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ─────────────────────────────────────────────
# REAL-WORLD INDIA-SPECIFIC EMISSION FACTORS
# Source: Ministry of Environment India + IPCC 2023
# ─────────────────────────────────────────────
EMISSION_FACTORS = {
    # Transport (kg CO2 per km)
    'transport_car':      0.171,
    'transport_bike':     0.089,
    'transport_bus':      0.039,
    'transport_metro':    0.018,
    'transport_auto':     0.095,
    'transport_flight':   0.255,
    'transport_train':    0.014,
    # Food (kg CO2 per serving)
    'food_beef':          6.61,
    'food_chicken':       1.29,
    'food_rice':          0.32,
    'food_vegetables':    0.15,
    'food_dairy':         0.94,
    'food_eggs':          0.45,
    # Energy (kg CO2 per kWh — India grid average)
    'energy_electricity': 0.716,
    'energy_lpg':         2.983,
    'energy_coal':        2.420,
    # Lifestyle
    'lifestyle_shopping': 0.5,
    'lifestyle_plastic':  2.0,
    'lifestyle_paper':    0.9,
}

# Simple category map for manual entries
CATEGORY_FACTORS = {
    'food':      2.5,
    'transport': 0.21,
    'energy':    0.716,  # India grid
    'lifestyle': 1.0
}

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect('ecotrack.db')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_color  TEXT DEFAULT '#10b981',
            city          TEXT DEFAULT 'India',
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS emissions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            category    TEXT NOT NULL,
            sub_type    TEXT DEFAULT '',
            activity    TEXT NOT NULL,
            amount      REAL NOT NULL,
            co2_amount  REAL NOT NULL,
            unit        TEXT DEFAULT '',
            date_logged TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source_type TEXT DEFAULT 'manual',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS chat_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            role       TEXT NOT NULL,
            message    TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS badges (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            badge_key  TEXT NOT NULL,
            earned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS goals (
            user_id     INTEGER PRIMARY KEY,
            weekly_goal REAL DEFAULT 50.0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS offsets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            action      TEXT NOT NULL,
            co2_saved   REAL NOT NULL,
            date_logged TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    conn.commit()
    conn.close()

def login_required(f):
    @wraps(f)
    def deco(*a, **kw):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*a, **kw)
    return deco

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
AVATAR_COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899']

def calc_co2(category, sub_type, amount):
    key = f"{category}_{sub_type}" if sub_type else category
    factor = EMISSION_FACTORS.get(key, CATEGORY_FACTORS.get(category, 1.0))
    return round(float(amount) * factor, 3)

BADGE_DEFS = {
    'first_log':      {'name': 'First Step',        'icon': '🌱', 'desc': 'Logged your first emission',          'color': '#10b981'},
    'ten_logs':       {'name': 'Consistent Tracker', 'icon': '📊', 'desc': 'Logged 10 emissions',                 'color': '#3b82f6'},
    'fifty_logs':     {'name': 'Data Warrior',       'icon': '⚔️',  'desc': 'Logged 50 emissions',                'color': '#8b5cf6'},
    'green_week':     {'name': 'Green Week',         'icon': '🏆', 'desc': 'Under 30 kg CO2 in recent 7 entries', 'color': '#f59e0b'},
    'transport_hero': {'name': 'Transport Hero',     'icon': '🚌', 'desc': '5+ transport entries logged',         'color': '#06b6d4'},
    'food_conscious': {'name': 'Food Conscious',     'icon': '🥗', 'desc': '5+ food entries logged',              'color': '#ec4899'},
    'offset_starter': {'name': 'Offset Starter',    'icon': '🌳', 'desc': 'Logged your first carbon offset',     'color': '#10b981'},
    'chatbot_fan':    {'name': 'EcoCoach Fan',       'icon': '🤖', 'desc': 'Asked EcoCoach 5 questions',          'color': '#f59e0b'},
    'low_emission':   {'name': 'Low Impact Life',    'icon': '💚', 'desc': 'Total emissions under 100 kg',        'color': '#10b981'},
}

def award_badges(user_id):
    conn = get_db()
    earned = {r['badge_key'] for r in conn.execute('SELECT badge_key FROM badges WHERE user_id=?', (user_id,)).fetchall()}
    new_badges = []
    tl  = conn.execute('SELECT COUNT(*) FROM emissions WHERE user_id=?', (user_id,)).fetchone()[0]
    tt  = conn.execute('SELECT COUNT(*) FROM emissions WHERE user_id=? AND category="transport"', (user_id,)).fetchone()[0]
    ft  = conn.execute('SELECT COUNT(*) FROM emissions WHERE user_id=? AND category="food"', (user_id,)).fetchone()[0]
    w7  = conn.execute('SELECT SUM(co2_amount) FROM emissions WHERE user_id=? ORDER BY date_logged DESC LIMIT 7', (user_id,)).fetchone()[0] or 0
    tot = conn.execute('SELECT SUM(co2_amount) FROM emissions WHERE user_id=?', (user_id,)).fetchone()[0] or 0
    oc  = conn.execute('SELECT COUNT(*) FROM offsets WHERE user_id=?', (user_id,)).fetchone()[0]
    cc  = conn.execute("SELECT COUNT(*) FROM chat_history WHERE user_id=? AND role='user'", (user_id,)).fetchone()[0]
    checks = {
        'first_log':      tl >= 1,
        'ten_logs':       tl >= 10,
        'fifty_logs':     tl >= 50,
        'green_week':     tl >= 3 and w7 < 30,
        'transport_hero': tt >= 5,
        'food_conscious': ft >= 5,
        'offset_starter': oc >= 1,
        'chatbot_fan':    cc >= 5,
        'low_emission':   tl >= 1 and tot < 100,
    }
    for k, cond in checks.items():
        if cond and k not in earned:
            conn.execute('INSERT INTO badges (user_id, badge_key) VALUES (?,?)', (user_id, k))
            new_badges.append({**BADGE_DEFS[k], 'key': k})
    conn.commit(); conn.close()
    return new_badges

# ─────────────────────────────────────────────
# SMART CHATBOT
# ─────────────────────────────────────────────
def get_chat_reply(msg):
    m = msg.lower()
    if any(w in m for w in ['transport','car','bike','bus','metro','auto','train','flight','drive','commute','travel']):
        return ("🚌 Transport Tips",
                "India's transport sector is the 3rd largest CO2 emitter. Key changes:\n• Metro/train: 14g CO2/km vs car at 171g/km — 12× less!\n• Switch to bus for daily commute: saves ~2.5 kg CO2/day\n• For short trips under 2 km: walk or cycle (0 emissions)\n• If driving: keep tyres inflated, avoid idling — saves 5-10% fuel")
    if any(w in m for w in ['food','eat','meal','meat','diet','veg','chicken','rice','dairy']):
        return ("🥗 Food & Diet Tips",
                "Food causes ~30% of India's household emissions:\n• Beef produces 6.6 kg CO2/serving vs vegetables at 0.15 kg — 44× more!\n• Eating vegetarian just 3 days/week saves ~200 kg CO2/year\n• Buy local produce — imported food has 50× more transport emissions\n• Reduce food waste: rotting food releases methane, a powerful greenhouse gas")
    if any(w in m for w in ['energy','electricity','power','lpg','gas','bulb','ac','fan','kwh']):
        return ("⚡ Energy Tips",
                "India's electricity grid emits 0.716 kg CO2 per kWh (one of the highest globally):\n• Replace 1 AC with a 5-star rated one: saves 300 kg CO2/year\n• Switch all bulbs to LED: saves 75% lighting energy\n• Unplug chargers & TVs on standby — they consume 5-10% of your bill\n• Use natural light and ventilation where possible")
    if any(w in m for w in ['offset','tree','plant','compensate','neutralize']):
        return ("🌳 Carbon Offsetting",
                "Carbon offsets compensate for your emissions:\n• Planting 1 tree absorbs ~21 kg CO2/year\n• Solar panel installation offsets ~600 kg CO2/year\n• Taking public transport instead of car for 1 month offsets ~75 kg CO2\n• Use the Offset Tracker panel to log your offset actions!")
    if any(w in m for w in ['score','eco score','rating','rank','points']):
        return ("⭐ Eco Score",
                "Your Eco Score (0–10) is calculated from your total logged emissions:\n• 10/10 = under 100 kg logged (excellent!)\n• Score decreases by 0.1 for every 10 kg added\n• The average Indian emits ~1,900 kg CO2/year (~158 kg/month)\n• Aim to stay below 50 kg/week to maintain a high score")
    if any(w in m for w in ['badge','achievement','unlock','reward','medal']):
        return ("🏆 Badges Guide",
                "Earn badges by hitting milestones:\n🌱 First Step — log your first emission\n📊 Consistent Tracker — log 10 emissions\n⚔️ Data Warrior — log 50 emissions\n🏆 Green Week — stay under 30 kg in 7 entries\n🚌 Transport Hero — 5+ transport logs\n🥗 Food Conscious — 5+ food logs\n🌳 Offset Starter — log your first offset\n🤖 EcoCoach Fan — ask 5 questions\n💚 Low Impact Life — total under 100 kg")
    if any(w in m for w in ['leaderboard','rank','compare','others','top','position','community']):
        return ("🏅 Leaderboard",
                "The leaderboard ranks all EcoTrack users by total CO2 — lower is better!\n• Your position updates live as you add entries\n• Green Week badge is awarded for staying low\n• The goal isn't to emit zero — it's to continuously improve\n• Compare yourself this week vs last week, not just vs others")
    if any(w in m for w in ['india','indian','delhi','mumbai','bangalore','emission','average']):
        return ("🇮🇳 India Emissions Context",
                "India-specific facts:\n• Average Indian: ~1.9 tonnes CO2/year (global avg: 4.7 tonnes)\n• India's grid: 0.716 kg CO2/kWh (coal-heavy)\n• Transport is fastest-growing emission source in India\n• India is 3rd largest emitter globally but 7th per capita\n• Good news: India added 175 GW of renewable energy by 2022!")
    if any(w in m for w in ['hello','hi','hey','start','help','what can']):
        return ("👋 Welcome to EcoCoach!",
                "I can help you with:\n🚌 Transport tips — how to cut travel emissions\n🥗 Food tips — diet changes that matter most\n⚡ Energy tips — reduce electricity & gas use\n🌳 Offset tips — how to compensate for emissions\n⭐ Eco Score — what your score means\n🏆 Badges — how to unlock achievements\n🇮🇳 India context — local emission facts\n\nJust type your question naturally!")
    return ("💬 EcoCoach",
            "I can help with transport 🚌, food 🥗, energy ⚡, offsets 🌳, your eco score ⭐, badges 🏆, leaderboard 🏅, and India-specific emission facts 🇮🇳.\n\nTry: 'how do I reduce my food emissions?' or 'what is my eco score?'")

# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────
@app.route('/')
def index(): return render_template('index.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        d = request.get_json()
        conn = get_db()
        u = conn.execute('SELECT * FROM users WHERE username=?', (d.get('username','').strip(),)).fetchone()
        conn.close()
        if u and check_password_hash(u['password_hash'], d.get('password','')):
            session.update({'user_id': u['id'], 'username': u['username'], 'avatar_color': u['avatar_color']})
            return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Invalid username or password'})
    return render_template('login.html')

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        d = request.get_json()
        u, e, p = d.get('username','').strip(), d.get('email','').strip(), d.get('password','')
        if not all([u,e,p]): return jsonify({'success': False, 'message': 'All fields are required'})
        import random
        color = random.choice(AVATAR_COLORS)
        try:
            conn = get_db()
            conn.execute('INSERT INTO users (username,email,password_hash,avatar_color) VALUES (?,?,?,?)',
                         (u, e, generate_password_hash(p), color))
            conn.commit(); conn.close()
            return jsonify({'success': True})
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'message': 'Username or email already exists'})
    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=session.get('username'), avatar_color=session.get('avatar_color','#10b981'))

@app.route('/logout')
def logout(): session.clear(); return redirect(url_for('index'))

# ── Emissions ──────────────────────────────────
@app.route('/api/emissions', methods=['GET','POST','DELETE'])
@login_required
def emissions_api():
    uid = session['user_id']
    conn = get_db()

    if request.method == 'DELETE':
        eid = request.get_json().get('id')
        conn.execute('DELETE FROM emissions WHERE id=? AND user_id=?', (eid, uid))
        conn.commit(); conn.close()
        return jsonify({'success': True})

    if request.method == 'POST':
        d = request.get_json()
        try:
            cat      = d.get('category', 'lifestyle')
            sub_type = d.get('sub_type', '')
            activity = d.get('activity', 'Activity').strip()
            amount   = float(d.get('amount', 0))
            unit     = d.get('unit', '')
            if amount <= 0: conn.close(); return jsonify({'success': False, 'message': 'Amount must be > 0'})
            co2 = calc_co2(cat, sub_type, amount)
            conn.execute('INSERT INTO emissions (user_id,category,sub_type,activity,amount,co2_amount,unit,source_type) VALUES (?,?,?,?,?,?,?,?)',
                         (uid, cat, sub_type, activity, amount, co2, unit, 'manual'))
            conn.commit(); conn.close()
            nb = award_badges(uid)
            return jsonify({'success': True, 'co2': co2, 'new_badges': nb})
        except ValueError:
            conn.close(); return jsonify({'success': False, 'message': 'Enter a valid number'})

    # GET — history
    rows = conn.execute('''SELECT id,date_logged,category,sub_type,activity,amount,co2_amount,unit
        FROM emissions WHERE user_id=? ORDER BY date_logged DESC LIMIT 20''', (uid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ── Upload ─────────────────────────────────────
@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files: return jsonify({'success': False, 'message': 'No file'})
    file = request.files['file']
    if not file.filename: return jsonify({'success': False, 'message': 'No file selected'})
    fn = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))
    fl = fn.lower()
    if any(k in fl for k in ['food','meal','restaurant','zomato','swiggy']): val,name,cat = 4.5,"Food Receipt (Scanned)",'food'
    elif any(k in fl for k in ['fuel','petrol','gas','hp','bp','iocl']):     val,name,cat = 12.0,"Fuel Receipt (Scanned)",'transport'
    elif any(k in fl for k in ['bill','electric','power','bescom','mseb']):  val,name,cat = 8.5,"Electricity Bill (Scanned)",'energy'
    else:                                                                      val,name,cat = 3.0,"Scanned Receipt",'lifestyle'
    conn = get_db()
    conn.execute('INSERT INTO emissions (user_id,category,activity,amount,co2_amount,source_type) VALUES (?,?,?,?,?,?)',
                 (session['user_id'],cat,name,1,val,'upload'))
    conn.commit(); conn.close()
    nb = award_badges(session['user_id'])
    return jsonify({'success': True, 'co2': val, 'item': name, 'new_badges': nb})

# ── Dashboard Stats ────────────────────────────
@app.route('/api/dashboard-stats')
@login_required
def dashboard_stats():
    uid = session['user_id']
    conn = get_db()
    total   = conn.execute('SELECT SUM(co2_amount) FROM emissions WHERE user_id=?',(uid,)).fetchone()[0] or 0
    cats    = conn.execute('SELECT category,SUM(co2_amount) as s FROM emissions WHERE user_id=? GROUP BY category',(uid,)).fetchall()
    trend   = conn.execute('SELECT date_logged,SUM(co2_amount) as s FROM emissions WHERE user_id=? GROUP BY date(date_logged) ORDER BY date_logged DESC LIMIT 14',(uid,)).fetchall()
    offsets = conn.execute('SELECT SUM(co2_saved) FROM offsets WHERE user_id=?',(uid,)).fetchone()[0] or 0
    # Streak: count consecutive days with at least 1 log
    days = conn.execute("SELECT DISTINCT date(date_logged) as d FROM emissions WHERE user_id=? ORDER BY d DESC",(uid,)).fetchall()
    streak = 0
    if days:
        today = datetime.now().date()
        for i, row in enumerate(days):
            expected = today - timedelta(days=i)
            if str(row['d']) == str(expected): streak += 1
            else: break
    # Weekly (last 7 days)
    week_start = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    weekly = conn.execute("SELECT SUM(co2_amount) FROM emissions WHERE user_id=? AND date_logged>=?",(uid,week_start)).fetchone()[0] or 0
    # Goal
    goal_row = conn.execute('SELECT weekly_goal FROM goals WHERE user_id=?',(uid,)).fetchone()
    weekly_goal = goal_row['weekly_goal'] if goal_row else 50.0
    conn.close()
    net = max(0, round(total - offsets, 2))
    return jsonify({
        'total':          round(total, 2),
        'net_total':      net,
        'offsets':        round(offsets, 2),
        'weekly':         round(weekly, 2),
        'weekly_goal':    weekly_goal,
        'weekly_pct':     min(100, round((weekly/weekly_goal)*100,1)) if weekly_goal else 0,
        'eco_score':      round(max(0, 10-(total/100)), 1),
        'streak':         streak,
        'categories':     [{'category': r['category'], 'co2': round(r['s'],2)} for r in cats],
        'trend':          [{'date': r['date_logged'][:10], 'co2': round(r['s'],2)} for r in reversed(trend)],
    })

# ── Recommendations ────────────────────────────
@app.route('/api/recommendations')
@login_required
def recommendations():
    conn = get_db()
    rows = conn.execute('SELECT category,activity,co2_amount FROM emissions WHERE user_id=? ORDER BY date_logged DESC LIMIT 10',(session['user_id'],)).fetchall()
    conn.close()
    if not rows:
        return jsonify([{'title':'Start Tracking','desc':'Add your first emission to get personalised tips!','impact':'High','icon':'🌱'}])
    cats  = [r['category'] for r in rows]
    total = sum(r['co2_amount'] for r in rows)
    tips  = []
    if 'transport' in cats: tips.append({'title':'Use Metro or Bus','desc':'Switching from car to metro for daily commute saves ~2.5 kg CO2/day — over 900 kg/year!','impact':'High','icon':'🚌'})
    if 'food' in cats:      tips.append({'title':'Go Veg 3 Days/Week','desc':'Skipping meat 3 days/week saves ~200 kg CO2/year. Rice+dal has 40× less footprint than beef.','impact':'High','icon':'🥗'})
    if 'energy' in cats:    tips.append({'title':'5-Star Rated Appliances','desc':'A 5-star AC uses 30% less power. India\'s grid emits 0.716 kg CO2/kWh — every kWh saved matters.','impact':'Medium','icon':'⚡'})
    if total > 30:          tips.append({'title':'Try Carbon Offsetting','desc':f'You\'ve logged {round(total,1)} kg CO2. Plant a tree or log a green action to offset it in the Offset Tracker!','impact':'Medium','icon':'🌳'})
    tips.append({'title':'Track Daily','desc':'Users who log daily reduce emissions 23% faster. Awareness is the first step to change.','impact':'Low','icon':'📱'})
    return jsonify(tips[:4])

# ── Chatbot ────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    d = request.get_json()
    msg = d.get('message','').strip()
    if not msg: return jsonify({'success': False})
    uid = session['user_id']
    conn = get_db()
    conn.execute('INSERT INTO chat_history (user_id,role,message) VALUES (?,?,?)',(uid,'user',msg))
    title, reply = get_chat_reply(msg)
    conn.execute('INSERT INTO chat_history (user_id,role,message) VALUES (?,?,?)',(uid,'bot',reply))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'title': title, 'reply': reply, 'new_badges': award_badges(uid)})

@app.route('/api/chat/history')
@login_required
def chat_history():
    conn = get_db()
    rows = conn.execute('SELECT role,message FROM chat_history WHERE user_id=? ORDER BY created_at ASC LIMIT 40',(session['user_id'],)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ── Leaderboard ────────────────────────────────
@app.route('/api/leaderboard')
@login_required
def leaderboard():
    conn = get_db()
    rows = conn.execute('''
        SELECT u.username, u.avatar_color,
               ROUND(COALESCE(SUM(e.co2_amount),0),2) as total_co2,
               COUNT(e.id) as logs,
               ROUND(COALESCE(SUM(o.co2_saved),0),2) as offset_total
        FROM users u
        LEFT JOIN emissions e ON u.id=e.user_id
        LEFT JOIN offsets o   ON u.id=o.user_id
        GROUP BY u.id ORDER BY total_co2 ASC LIMIT 15
    ''').fetchall()
    conn.close()
    me = session.get('username')
    return jsonify([{
        'rank': i+1, 'username': r['username'], 'avatar_color': r['avatar_color'],
        'total_co2': r['total_co2'], 'logs': r['logs'],
        'offset_total': r['offset_total'],
        'net': round(max(0, r['total_co2'] - r['offset_total']), 2),
        'is_you': r['username'] == me
    } for i,r in enumerate(rows)])

# ── Badges ─────────────────────────────────────
@app.route('/api/badges')
@login_required
def get_badges():
    conn = get_db()
    earned = {r['badge_key']: r['earned_at'] for r in
              conn.execute('SELECT badge_key,earned_at FROM badges WHERE user_id=? ORDER BY earned_at',(session['user_id'],)).fetchall()}
    conn.close()
    return jsonify([{'key':k,'earned':k in earned,'earned_at':earned.get(k),**v} for k,v in BADGE_DEFS.items()])

# ── Goals ──────────────────────────────────────
@app.route('/api/goals', methods=['GET','POST'])
@login_required
def goals():
    uid = session['user_id']
    conn = get_db()
    if request.method == 'POST':
        wg = float(request.get_json().get('weekly_goal', 50.0))
        conn.execute('INSERT INTO goals (user_id,weekly_goal) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET weekly_goal=?',(uid,wg,wg))
        conn.commit(); conn.close()
        return jsonify({'success': True, 'weekly_goal': wg})
    row = conn.execute('SELECT weekly_goal FROM goals WHERE user_id=?',(uid,)).fetchone()
    conn.close()
    return jsonify({'weekly_goal': row['weekly_goal'] if row else 50.0})

# ── NEW: Carbon Offset Tracker ─────────────────
OFFSET_ACTIONS = {
    'tree':       {'name': 'Plant a Tree',          'co2_per_unit': 21.0,  'unit': 'trees'},
    'solar':      {'name': 'Solar Panel (month)',   'co2_per_unit': 50.0,  'unit': 'months'},
    'public':     {'name': 'Public Transport Day',  'co2_per_unit': 2.5,   'unit': 'days'},
    'meatfree':   {'name': 'Meat-Free Day',         'co2_per_unit': 1.5,   'unit': 'days'},
    'cycle':      {'name': 'Cycling Instead of Car','co2_per_unit': 1.7,   'unit': 'days'},
    'led':        {'name': 'LED Bulbs Switched',    'co2_per_unit': 0.3,   'unit': 'bulbs/month'},
    'compost':    {'name': 'Composting (month)',    'co2_per_unit': 3.0,   'unit': 'months'},
    'carpool':    {'name': 'Carpool Day',           'co2_per_unit': 1.2,   'unit': 'days'},
}

@app.route('/api/offsets', methods=['GET','POST'])
@login_required
def offsets_api():
    uid = session['user_id']
    conn = get_db()
    if request.method == 'POST':
        d      = request.get_json()
        action = d.get('action')
        qty    = float(d.get('quantity', 1))
        if action not in OFFSET_ACTIONS: conn.close(); return jsonify({'success': False, 'message': 'Unknown action'})
        co2_saved = round(OFFSET_ACTIONS[action]['co2_per_unit'] * qty, 2)
        conn.execute('INSERT INTO offsets (user_id,action,co2_saved) VALUES (?,?,?)', (uid, action, co2_saved))
        conn.commit(); conn.close()
        nb = award_badges(uid)
        return jsonify({'success': True, 'co2_saved': co2_saved, 'new_badges': nb})
    rows = conn.execute('SELECT action,co2_saved,date_logged FROM offsets WHERE user_id=? ORDER BY date_logged DESC LIMIT 10',(uid,)).fetchall()
    total = conn.execute('SELECT SUM(co2_saved) FROM offsets WHERE user_id=?',(uid,)).fetchone()[0] or 0
    conn.close()
    return jsonify({'history': [dict(r) for r in rows], 'total': round(total,2), 'actions': OFFSET_ACTIONS})

@app.route('/api/emission-factors')
@login_required
def emission_factors():
    return jsonify(EMISSION_FACTORS)

if __name__ == '__main__':
    init_db()
    print("="*55)
    print("  🌿 EcoTrack v3 — Premium Edition")
    print("  Open: http://127.0.0.1:5000")
    print("="*55)
    app.run(debug=True, port=5000)
