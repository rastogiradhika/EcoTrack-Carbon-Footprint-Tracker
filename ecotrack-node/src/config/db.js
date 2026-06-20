// src/config/db.js
// ─────────────────────────────────────────────
// MongoDB connection via Mongoose
// Migration note: replaces sqlite3.connect() + PRAGMA WAL
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 has these on by default, listed for clarity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB disconnected on app termination');
  process.exit(0);
});

module.exports = connectDB;
