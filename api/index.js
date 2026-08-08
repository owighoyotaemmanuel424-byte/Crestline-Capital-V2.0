const mongoose = require('mongoose');
const app = require('../backend/server');

let connectionPromise;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  connectionPromise ||= mongoose.connect(process.env.MONGODB_URI);
  await connectionPromise;
}

module.exports = async (req, res) => {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Crestline API initialization failed:', error);
    return res.status(503).json({ message: 'Banking services are temporarily unavailable.' });
  }
};
