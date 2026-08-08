const mongoose = require('mongoose');

const TransferRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  statusCode: { type: Number, required: true },
  response: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }
});

TransferRequestSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('TransferRequest', TransferRequestSchema);
