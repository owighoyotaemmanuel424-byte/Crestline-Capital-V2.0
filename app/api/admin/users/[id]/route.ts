import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectMongo, User, Transaction, AuditLog, authenticatedUser, bcrypt, mongoose, makeReference, audit } from '@/lib/server-banking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const objectId = (id: string) => mongoose.isValidObjectId(id);

async function admin(request: Request) {
  const actor = await authenticatedUser(request);
  if (!actor.isAdmin) throw Object.assign(new Error('Admin access required'), { status: 403 });
  return actor;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    const actor = await admin(request);
    if (!objectId(params.id)) return json({ message: 'Invalid user id' }, 400);
    const target = await User.findById(params.id).select('-password -pin');
    if (!target) return json({ message: 'User not found' }, 404);
    const [transactions, loginLogs] = await Promise.all([
      Transaction.find({ $or: [{ senderId: target._id }, { receiverId: target._id }] }).sort({ createdAt: -1 }).limit(100),
      AuditLog.find({ targetId: target._id, action: 'AUTH_LOGIN' }).sort({ createdAt: -1 }).limit(100),
    ]);
    return json({
      user: { ...target.toObject(), id: target._id.toString(), balance: Number(target.balance?.toString() || 0) },
      transactions,
      loginActivity: loginLogs.map((log: any) => ({ when: log.createdAt, ip: log.ip || '—', userAgent: log.userAgent || '—' })),
      viewer: actor._id.toString(),
    });
  } catch (e: any) { return json({ message: e?.message || 'Unable to load customer' }, e?.status || 500); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    const actor = await admin(request);
    if (!objectId(params.id)) return json({ message: 'Invalid user id' }, 400);
    const body = await request.json();
    const schema = z.object({
      status: z.enum(['active', 'suspended', 'closed']).optional(),
      accountState: z.enum(['active', 'inactive', 'on-hold', 'suspended']).optional(),
      kycStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
      emailVerified: z.boolean().optional(),
      twoFactorEnabled: z.boolean().optional(),
      forcePinCheck: z.boolean().optional(),
      restrictedMessages: z.object({ inactive: z.string().max(500), onHold: z.string().max(500), suspended: z.string().max(500), blocked: z.string().max(500) }).optional(),
    });
    const data = schema.parse(body);
    const target = await User.findByIdAndUpdate(params.id, data, { new: true, runValidators: true }).select('-password -pin');
    if (!target) return json({ message: 'User not found' }, 404);
    if (data.status === 'suspended' || data.status === 'closed') await User.findByIdAndUpdate(params.id, { isFrozen: true });
    await audit('ADMIN_UPDATE_ACCOUNT', actor._id, target._id, data, undefined, request);
    return json({ user: { ...target.toObject(), id: target._id.toString(), balance: Number(target.balance?.toString() || 0) } });
  } catch (e: any) { return json({ message: e?.issues?.[0]?.message || e?.message || 'Unable to update account' }, e?.status || 400); }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    const actor = await admin(request);
    if (!objectId(params.id)) return json({ message: 'Invalid user id' }, 400);
    const target = await User.findById(params.id);
    if (!target) return json({ message: 'User not found' }, 404);
    const body = await request.json();

    if (body.action === 'rotate-account') {
      let accountNumber = '';
      for (let i = 0; i < 20 && !accountNumber; i++) { const candidate = String(Math.floor(1000000000 + Math.random() * 9000000000)); if (!(await User.exists({ accountNumber: candidate }))) accountNumber = candidate; }
      if (!accountNumber) return json({ message: 'Unable to rotate account number' }, 500);
      const old = target.accountNumber; target.accountNumber = accountNumber; await target.save();
      await audit('ADMIN_ROTATE_ACCOUNT_NUMBER', actor._id, target._id, { oldAccountNumber: old, newAccountNumber: accountNumber }, undefined, request);
      return json({ accountNumber });
    }

    if (body.action === 'reset-pin') {
      target.pin = await bcrypt.hash('', 12); target.forcePinCheck = true; await target.save();
      await audit('ADMIN_RESET_TRANSACTION_PIN', actor._id, target._id, {}, undefined, request);
      return json({ message: 'Transaction PIN cleared. Customer must set a new PIN.' });
    }

    if (body.action === 'balance') {
      const data = z.object({ direction: z.enum(['credit', 'debit']), amount: z.number().positive().finite().max(100000000), note: z.string().max(160).optional() }).parse(body);
      const current = Number(target.balance?.toString() || 0);
      const next = data.direction === 'credit' ? current + data.amount : current - data.amount;
      if (next < 0) return json({ message: 'Debit would create a negative balance' }, 400);
      target.balance = mongoose.Types.Decimal128.fromString(next.toFixed(2)); await target.save();
      const reference = makeReference();
      await Transaction.create({ receiverId: data.direction === 'credit' ? target._id : undefined, senderId: data.direction === 'debit' ? target._id : undefined, amount: mongoose.Types.Decimal128.fromString(data.amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString('0'), type: 'manual', direction: data.direction, description: data.note || (data.direction === 'credit' ? 'Admin credit adjustment' : 'Admin debit adjustment'), status: 'success', reference, affectsBalance: true, adminCreated: true });
      await audit(data.direction === 'credit' ? 'ADMIN_BALANCE_CREDIT' : 'ADMIN_BALANCE_DEBIT', actor._id, target._id, { amount: data.amount, note: data.note, balanceBefore: current, balanceAfter: next }, reference, request);
      return json({ balance: next, reference });
    }

    if (body.action === 'transaction') {
      const data = z.object({ direction: z.enum(['credit', 'debit']), amount: z.number().positive().finite().max(100000000), label: z.string().trim().min(1).max(160), occurredAt: z.string().optional(), affectsBalance: z.boolean().default(true) }).parse(body);
      const current = Number(target.balance?.toString() || 0);
      const next = data.affectsBalance ? (data.direction === 'credit' ? current + data.amount : current - data.amount) : current;
      if (next < 0) return json({ message: 'Transaction would create a negative balance' }, 400);
      if (data.affectsBalance) { target.balance = mongoose.Types.Decimal128.fromString(next.toFixed(2)); await target.save(); }
      const reference = makeReference();
      const tx = await Transaction.create({ receiverId: data.direction === 'credit' ? target._id : undefined, senderId: data.direction === 'debit' ? target._id : undefined, amount: mongoose.Types.Decimal128.fromString(data.amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString('0'), type: 'manual', direction: data.direction, description: data.label, status: 'success', reference, affectsBalance: data.affectsBalance, displayOnly: !data.affectsBalance, adminCreated: true, occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date() });
      await audit('ADMIN_ADD_TRANSACTION', actor._id, target._id, { direction: data.direction, amount: data.amount, label: data.label, affectsBalance: data.affectsBalance }, reference, request);
      return json({ transaction: tx, balance: next }, 201);
    }

    return json({ message: 'Unknown admin action' }, 400);
  } catch (e: any) { return json({ message: e?.issues?.[0]?.message || e?.message || 'Admin action failed' }, e?.status || 400); }
}
