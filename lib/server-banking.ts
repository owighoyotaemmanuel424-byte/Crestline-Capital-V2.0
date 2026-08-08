import mongoose, { Schema, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }
  await mongoose.connect(uri, { dbName: 'crestline' });
  return mongoose.connection;
}

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  pin: { type: String, required: true },
  accountNumber: { type: String, required: true, unique: true, index: true },
  balance: { type: Schema.Types.Decimal128, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isFrozen: { type: Boolean, default: false },
  kycStatus: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'pending', index: true },
}, { timestamps: true });

const TransactionSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Schema.Types.Decimal128, required: true },
  fee: { type: Schema.Types.Decimal128, required: true },
  type: { type: String, enum: ['internal', 'external'], required: true },
  description: { type: String, trim: true, maxlength: 160 },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
  reference: { type: String, required: true, unique: true, index: true },
}, { timestamps: true });

const TransferRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  statusCode: { type: Number, required: true },
  response: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});
TransferRequestSchema.index({ userId: 1, key: 1 }, { unique: true });

const AuditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId },
  reference: String,
  metadata: Schema.Types.Mixed,
  ip: String,
  userAgent: String,
}, { timestamps: true });

export const User = models.User || model('User', UserSchema);
export const Transaction = models.Transaction || model('Transaction', TransactionSchema);
export const TransferRequest = models.TransferRequest || model('TransferRequest', TransferRequestSchema);
export const AuditLog = models.AuditLog || model('AuditLog', AuditLogSchema);

export type UserDoc = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  pin: string;
  accountNumber: string;
  balance: mongoose.Types.Decimal128;
  isAdmin: boolean;
  isFrozen: boolean;
  kycStatus?: 'verified' | 'pending' | 'rejected';
  createdAt?: Date;
};

export function publicUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    accountNumber: user.accountNumber,
    balance: Number(user.balance?.toString() || 0),
    isAdmin: Boolean(user.isAdmin),
    isFrozen: Boolean(user.isFrozen),
  };
}

export function signToken(user: UserDoc) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ userId: user._id.toString() }, secret, { expiresIn: '1d' });
}

export async function authenticatedUser(request: Request): Promise<UserDoc> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) throw new Error('UNAUTHORIZED');
  const payload = jwt.verify(token, secret) as { userId?: string };
  if (!payload.userId) throw new Error('UNAUTHORIZED');
  const user = await User.findById(payload.userId) as UserDoc | null;
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export function feeFor(amount: number, type: 'internal' | 'external') {
  return type === 'internal' ? 0 : Math.min(25, Math.max(2.5, amount * 0.005));
}

export function makeReference() {
  return `CRL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function validIdempotencyKey(value: string | null) {
  return Boolean(value && /^[A-Za-z0-9._:-]{16,128}$/.test(value));
}

export async function audit(action: string, actorId: mongoose.Types.ObjectId, targetId?: mongoose.Types.ObjectId, metadata?: Record<string, unknown>, reference?: string, request?: Request) {
  await AuditLog.create({ actorId, action, targetId, metadata, reference, ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '', userAgent: request?.headers.get('user-agent') || '' });
}

export { bcrypt, mongoose };