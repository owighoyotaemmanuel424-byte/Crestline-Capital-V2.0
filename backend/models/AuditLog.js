const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
  reference: { type: String, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ip: String,
  userAgent: String
}, { timestamps: true, strict: true });

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
