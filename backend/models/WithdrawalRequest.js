const mongoose = require('mongoose');

const WithdrawalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  fee: { type: mongoose.Schema.Types.Decimal128, required: true },
  netAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
  destination: {
    type: new mongoose.Schema({
      type: { type: String, enum: ['bank'], required: true },
      accountName: { type: String, required: true, trim: true, maxlength: 120 },
      accountNumber: { type: String, required: true, trim: true, maxlength: 34 },
      bankCode: { type: String, required: true, trim: true, maxlength: 20 }
    }, { _id: false }),
    required: true
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'], default: 'pending', index: true },
  reference: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  rejectionReason: { type: String, trim: true, maxlength: 500 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  provider: { type: String, enum: ['paystack'], default: 'paystack' },
  providerReference: { type: String, unique: true, sparse: true, index: true },
  providerTransferCode: { type: String },
  providerStatus: { type: String, enum: ['pending', 'success', 'failed', 'reversed', 'otp', 'blocked', 'abandoned'] },
  providerError: { type: String, maxlength: 1000 },
  payoutInitiatedAt: { type: Date },
  paidAt: { type: Date }
}, { timestamps: true });

WithdrawalRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);
