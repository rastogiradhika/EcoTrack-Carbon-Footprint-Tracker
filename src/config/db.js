// src/config/db.js
// ─────────────────────────────────────────────
// MongoDB connection via Mongoose
// Migration note: replaces sqlite3.connect() + PRAGMA WAL
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecotrack';

  try {
    const conn = await mongoose.connect(mongoUri, {
      // Mongoose 8 has these on by default, listed for clarity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    // In platform environments (Vercel) it's preferable not to hard-exit
    // the process when the DB is temporarily unreachable. Log the error so
    // deploys and static pages can still be served while the DB is fixed.
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Hint: set MONGO_URI as an environment variable (e.g., Atlas connection string)');
    // Do not exit(1) here — allow the server to start so static pages work.
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB disconnected on app termination');
  process.exit(0);
});

module.exports = connectDB;
