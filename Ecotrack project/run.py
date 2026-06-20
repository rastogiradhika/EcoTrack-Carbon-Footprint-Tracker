#!/usr/bin/env python3
import os
from app import app, init_db

os.makedirs('uploads', exist_ok=True)
init_db()

print("="*55)
print("  🌿 EcoTrack v3 — Premium Edition")
print("  Open: http://127.0.0.1:5000")
print("  Press Ctrl+C to stop")
print("="*55)

app.run(debug=True, port=5000)
