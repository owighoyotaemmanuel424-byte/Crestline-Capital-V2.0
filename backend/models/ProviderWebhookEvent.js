const mongoose = require('mongoose');

const ProviderWebhookEventSchema = new mongoose.Schema({
  provider: { type: String, enum: ['paystack'], required: true },
  eventId: { type: String, required: true, unique: true, index: true },
  event: { type: String, required: true },
  reference: { type: String, index: true },
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  status: { type: String, enum: ['received', 'processed', 'ignored', 'failed'], default: 'received' },
  error: { type: String, maxlength: 1000 }
}, { timestamps: true });

module.exports = mongoose.model('ProviderWebhookEvent', ProviderWebhookEventSchema);
