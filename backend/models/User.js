const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  pin: { type: String, required: true },
  accountNumber: { type: String, required: true, unique: true, index: true },
  balance: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isFrozen: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
