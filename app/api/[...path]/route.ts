import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectMongo, User, Transaction, TransferRequest, AuditLog, authenticatedUser, publicUser, signToken, feeFor, makeReference, validIdempotencyKey, bcrypt, mongoose, audit } from '@/lib/server-banking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email(), password: z.string().min(8).max(128), pin: z.string().regex(/^\d{4,6}$/) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });
const transferSchema = z.object({ recipientAccountNumber: z.string().regex(/^\d{10,20}$/), amount: z.number().positive().finite().max(1_000_000), type: z.enum(['internal', 'external']), description: z.string().max(160).optional(), pin: z.string().regex(/^\d{4,6}$/) });

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const errorMessage = (e: any, fallback: string) => e?.issues?.[0]?.message || e?.message || fallback;

async function route(request: Request, path: string[]) {
  await connectMongo();
  const method = request.method.toUpperCase();
  const key = path.join('/');

  if (method === 'GET' && key === 'health') return json({ ok: true, service: 'crestline-api' });

  if (method === 'POST' && key === 'auth/register') {
    try {
      const data = registerSchema.parse(await request.json());
      const email = data.email.toLowerCase();
      if (await User.exists({ email })) return json({ message: 'Email already registered' }, 409);
      let accountNumber = '';
      for (let i = 0; i < 10; i += 1) {
        accountNumber = String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000));
        if (!(await User.exists({ accountNumber }))) break;
      }
      if (!accountNumber) return json({ message: 'Unable to generate account number' }, 500);
      const user = await User.create({ name: data.name, email, password: await bcrypt.hash(data.password, 12), pin: await bcrypt.hash(data.pin, 12), accountNumber, balance: mongoose.Types.Decimal128.fromString('0') });
      await AuditLog.create({ actorId: user._id, action: 'AUTH_REGISTER', targetId: user._id, ip: request.headers.get('x-forwarded-for') || '', userAgent: request.headers.get('user-agent') || '' });
      return json({ token: signToken(user), user: publicUser(user) }, 201);
    } catch (e: any) { return json({ message: errorMessage(e, 'Unable to create account') }, 400); }
  }

  if (method === 'POST' && key === 'auth/login') {
    try {
      const data = loginSchema.parse(await request.json());
      const user = await User.findOne({ email: data.email.toLowerCase() }) as any;
      if (!user || !(await bcrypt.compare(data.password, user.password))) return json({ message: 'Invalid email or password' }, 401);
      if (user.isFrozen) return json({ message: 'Account is frozen. Contact support.' }, 403);
      await AuditLog.create({ actorId: user._id, action: 'AUTH_LOGIN', targetId: user._id, ip: request.headers.get('x-forwarded-for') || '', userAgent: request.headers.get('user-agent') || '' });
      return json({ token: signToken(user), user: publicUser(user) });
    } catch (e: any) { return json({ message: errorMessage(e, 'Unable to sign in') }, 400); }
  }

  let user;
  try { user = await authenticatedUser(request); } catch { return json({ message: 'Authentication required' }, 401); }

  if (method === 'GET' && key === 'user') return json({ user: publicUser(user) });

  if (method === 'GET' && key === 'transactions') {
    const docs = await Transaction.find({ $or: [{ senderId: user._id }, { receiverId: user._id }] }).sort({ createdAt: -1 }).limit(100).populate('senderId', 'name accountNumber').populate('receiverId', 'name accountNumber');
    return json({ transactions: docs.map((t: any) => ({ id: t._id, reference: t.reference, amount: Number(t.amount.toString()), fee: Number(t.fee.toString()), type: t.type, status: t.status, description: t.description || '', createdAt: t.createdAt, direction: t.senderId._id.toString() === user._id.toString() ? 'debit' : 'credit', counterparty: t.senderId._id.toString() === user._id.toString() ? t.receiverId.name : t.senderId.name })) });
  }

  if (method === 'GET' && key.startsWith('transfer/recipient/')) {
    const accountNumber = key.split('/').pop() || '';
    if (!/^\d{10,20}$/.test(accountNumber)) return json({ message: 'Invalid account number' }, 400);
    const recipient = await User.findOne({ accountNumber }).select('name accountNumber isFrozen') as any;
    if (!recipient) return json({ message: 'Recipient account not found' }, 404);
    return json({ recipient: { name: recipient.name, accountNumber: recipient.accountNumber, isFrozen: recipient.isFrozen } });
  }

  if (method === 'POST' && key === 'transfer') {
    const idempotency = request.headers.get('Idempotency-Key');
    if (!validIdempotencyKey(idempotency)) return json({ message: 'A valid Idempotency-Key header is required' }, 400);
    const data = transferSchema.parse(await request.json());
    if (data.recipientAccountNumber === user.accountNumber) return json({ message: 'You cannot transfer to yourself' }, 400);
    if (user.isFrozen) return json({ message: 'Your account is frozen' }, 403);
    if (!(await bcrypt.compare(data.pin, user.pin))) return json({ message: 'Incorrect transfer PIN' }, 401);
    const fee = feeFor(data.amount, data.type);
    const total = Number((data.amount + fee).toFixed(2));
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const daily = await Transaction.aggregate([{ $match: { senderId: user._id, createdAt: { $gte: todayStart }, status: 'success' } }, { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }]);
    if ((daily[0]?.total || 0) + data.amount > 100_000) return json({ message: 'Daily transfer limit exceeded' }, 400);

    const existing = await TransferRequest.findOne({ userId: user._id, key: idempotency });
    if (existing) return json(existing.response, existing.statusCode || 200);

    const session = await mongoose.startSession();
    try {
      let responsePayload: any;
      await session.withTransaction(async () => {
        const duplicate = await TransferRequest.findOne({ userId: user._id, key: idempotency }).session(session);
        if (duplicate) { responsePayload = duplicate.response; return; }
        const sender = await User.findById(user._id).session(session) as any;
        const receiver = await User.findOne({ accountNumber: data.recipientAccountNumber }).session(session) as any;
        if (!sender || sender.isFrozen) throw Object.assign(new Error('Sender account is unavailable'), { status: 403 });
        if (!receiver) throw Object.assign(new Error('Recipient account not found'), { status: 404 });
        if (receiver.isFrozen) throw Object.assign(new Error('Recipient account is frozen'), { status: 403 });
        const senderBalance = Number(sender.balance?.toString() || 0);
        if (senderBalance < total) throw Object.assign(new Error('Insufficient balance'), { status: 400 });
        sender.balance = mongoose.Types.Decimal128.fromString((senderBalance - total).toFixed(2));
        receiver.balance = mongoose.Types.Decimal128.fromString((Number(receiver.balance?.toString() || 0) + data.amount).toFixed(2));
        await sender.save({ session }); await receiver.save({ session });
        const reference = makeReference();
        const [tx] = await Transaction.create([{ senderId: sender._id, receiverId: receiver._id, amount: mongoose.Types.Decimal128.fromString(data.amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString(fee.toFixed(2)), type: data.type, description: data.description || '', status: 'success', reference }], { session });
        responsePayload = { message: 'Transfer completed successfully', reference: tx.reference, amount: data.amount, fee, total };
        await TransferRequest.create([{ userId: sender._id, key: idempotency, statusCode: 201, response: responsePayload }], { session });
        await AuditLog.create([{ actorId: sender._id, action: 'TRANSFER_COMPLETED', targetId: receiver._id, reference, metadata: { amount: data.amount, fee, type: data.type }, ip: request.headers.get('x-forwarded-for') || '', userAgent: request.headers.get('user-agent') || '' }], { session });
      });
      return json(responsePayload, 201);
    } catch (e: any) {
      if (e?.code === 11000) {
        const duplicate = await TransferRequest.findOne({ userId: user._id, key: idempotency });
        if (duplicate) return json(duplicate.response, duplicate.statusCode || 200);
      }
      return json({ message: e?.message || 'Transfer failed' }, e?.status || 500);
    } finally { await session.endSession(); }
  }

  if (method === 'GET' && key === 'admin/users') {
    if (!user.isAdmin) return json({ message: 'Admin access required' }, 403);
    const users = await User.find().select('-password -pin').sort({ createdAt: -1 });
    return json({ users: users.map((u: any) => publicUser(u)) });
  }

  if (method === 'GET' && key === 'admin/transactions') {
    if (!user.isAdmin) return json({ message: 'Admin access required' }, 403);
    return json({ transactions: await Transaction.find().sort({ createdAt: -1 }).limit(500) });
  }

  if (method === 'PATCH' && key.startsWith('admin/users/') && key.endsWith('/freeze')) {
    if (!user.isAdmin) return json({ message: 'Admin access required' }, 403);
    const targetId = key.split('/')[2];
    if (!mongoose.isValidObjectId(targetId)) return json({ message: 'Invalid user id' }, 400);
    const body = await request.json();
    const target = await User.findByIdAndUpdate(targetId, { isFrozen: Boolean(body.frozen) }, { new: true });
    if (!target) return json({ message: 'User not found' }, 404);
    await audit(Boolean(body.frozen) ? 'ADMIN_FREEZE_ACCOUNT' : 'ADMIN_UNFREEZE_ACCOUNT', user._id, target._id, {}, undefined, request);
    return json({ user: publicUser(target as any) });
  }

  if (method === 'GET' && key === 'admin/audit-logs') {
    if (!user.isAdmin) return json({ message: 'Admin access required' }, 403);
    return json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(500).populate('actorId', 'name email') });
  }

  return json({ message: 'API route not found' }, 404);
}

export async function GET(request: Request, context: { params: { path: string[] } }) {
  try { return await route(request, context.params.path || []); } catch (e: any) { console.error('GET API error', e); return json({ message: 'Banking service temporarily unavailable' }, 503); }
}
export async function POST(request: Request, context: { params: { path: string[] } }) {
  try { return await route(request, context.params.path || []); } catch (e: any) { console.error('POST API error', e); return json({ message: errorMessage(e, 'Request failed') }, 400); }
}
export async function PATCH(request: Request, context: { params: { path: string[] } }) {
  try { return await route(request, context.params.path || []); } catch (e: any) { console.error('PATCH API error', e); return json({ message: errorMessage(e, 'Request failed') }, 400); }
}
