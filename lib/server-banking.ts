import mongoose, { Schema, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) { await mongoose.connection.asPromise(); return mongoose.connection; }
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
  status: { type: String, enum: ['active', 'suspended', 'closed'], default: 'active', index: true },
  accountState: { type: String, enum: ['active', 'inactive', 'on-hold', 'suspended'], default: 'active' },
  kycStatus: { type: String, enum: ['unverified', 'verified', 'pending', 'rejected'], default: 'pending', index: true },
  emailVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  forcePinCheck: { type: Boolean, default: false },
  restrictedMessages: { inactive: { type: String, default: '' }, onHold: { type: String, default: '' }, suspended: { type: String, default: '' }, blocked: { type: String, default: '' } },
  lastLoginAt: { type: Date },
}, { timestamps: true });

const TransactionSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User' }, receiverId: { type: Schema.Types.ObjectId, ref: 'User' }, amount: { type: Schema.Types.Decimal128, required: true }, fee: { type: Schema.Types.Decimal128, default: 0 }, type: { type: String, enum: ['internal', 'external', 'manual'], required: true }, direction: { type: String, enum: ['credit', 'debit'] }, description: { type: String, trim: true, maxlength: 160 }, status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' }, reference: { type: String, required: true, unique: true, index: true }, affectsBalance: { type: Boolean, default: true }, displayOnly: { type: Boolean, default: false }, adminCreated: { type: Boolean, default: false }, occurredAt: { type: Date },
}, { timestamps: true });

const CardSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  brand: { type: String, enum: ['visa', 'mastercard'], default: 'visa' },
  type: { type: String, enum: ['virtual', 'physical'], default: 'virtual' },
  last4: { type: String, required: true, match: /^\d{4}$/ },
  status: { type: String, enum: ['pending', 'active', 'frozen', 'revoked'], default: 'pending', index: true },
  spendingLimit: { type: Schema.Types.Decimal128, default: 1000 },
  mccRestrictions: { type: [String], default: [] },
  issuedAt: { type: Date },
  revokedAt: { type: Date },
  freezeReason: { type: String, maxlength: 240 },
}, { timestamps: true });
CardSchema.index({ userId: 1, createdAt: -1 });

const TransferRequestSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, key: { type: String, required: true }, statusCode: { type: Number, required: true }, response: { type: Schema.Types.Mixed, required: true }, createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 } });
TransferRequestSchema.index({ userId: 1, key: 1 }, { unique: true });
const AuditLogSchema = new Schema({ actorId: { type: Schema.Types.ObjectId, ref: 'User' }, action: { type: String, required: true }, targetId: { type: Schema.Types.ObjectId }, reference: String, metadata: Schema.Types.Mixed, ip: String, userAgent: String }, { timestamps: true });

export const User = models.User || model('User', UserSchema);
export const Transaction = models.Transaction || model('Transaction', TransactionSchema);
export const Card = models.Card || model('Card', CardSchema);
export const TransferRequest = models.TransferRequest || model('TransferRequest', TransferRequestSchema);
export const AuditLog = models.AuditLog || model('AuditLog', AuditLogSchema);

export type UserDoc = { _id: mongoose.Types.ObjectId; name: string; email: string; password: string; pin: string; accountNumber: string; balance: mongoose.Types.Decimal128; isAdmin: boolean; isFrozen: boolean; status?: string; accountState?: string; kycStatus?: 'unverified' | 'verified' | 'pending' | 'rejected'; emailVerified?: boolean; twoFactorEnabled?: boolean; forcePinCheck?: boolean; restrictedMessages?: { inactive?: string; onHold?: string; suspended?: string; blocked?: string }; lastLoginAt?: Date; createdAt?: Date };
export function publicUser(user: UserDoc) { return { id: user._id.toString(), name: user.name, email: user.email, accountNumber: user.accountNumber, balance: Number(user.balance?.toString() || 0), isAdmin: Boolean(user.isAdmin), isFrozen: Boolean(user.isFrozen), status: user.status || (user.isFrozen ? 'suspended' : 'active'), accountState: user.accountState || 'active', kycStatus: user.kycStatus || 'pending', emailVerified: Boolean(user.emailVerified), twoFactorEnabled: Boolean(user.twoFactorEnabled), forcePinCheck: Boolean(user.forcePinCheck), restrictedMessages: user.restrictedMessages || {}, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt }; }
export function signToken(user: UserDoc) { const secret = process.env.JWT_SECRET; if (!secret) throw new Error('JWT_SECRET is not configured'); return jwt.sign({ userId: user._id.toString() }, secret, { expiresIn: '1d' }); }
export async function authenticatedUser(request: Request): Promise<UserDoc> { const header = request.headers.get('authorization') || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : ''; const secret = process.env.JWT_SECRET; if (!token || !secret) throw new Error('UNAUTHORIZED'); const payload = jwt.verify(token, secret) as { userId?: string }; if (!payload.userId) throw new Error('UNAUTHORIZED'); const user = await User.findById(payload.userId) as UserDoc | null; if (!user) throw new Error('UNAUTHORIZED'); return user; }
export function feeFor(amount: number, type: 'internal' | 'external') { return type === 'internal' ? 0 : Math.min(25, Math.max(2.5, amount * 0.005)); }
export function makeReference() { return `CRL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }
export function validIdempotencyKey(value: string | null) { return Boolean(value && /^[A-Za-z0-9._:-]{16,128}$/.test(value)); }
export async function audit(action: string, actorId: mongoose.Types.ObjectId, targetId?: mongoose.Types.ObjectId, metadata?: Record<string, unknown>, reference?: string, request?: Request) { await AuditLog.create({ actorId, action, targetId, metadata, reference, ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '', userAgent: request?.headers.get('user-agent') || '' }); }
export { bcrypt, mongoose };