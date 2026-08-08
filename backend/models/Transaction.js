const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  fee: { type: mongoose.Schema.Types.Decimal128, required: true },
  type: { type: String, enum: ['internal', 'external'], required: true },
  description: { type: String, trim: true, maxlength: 160 },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  reference: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
