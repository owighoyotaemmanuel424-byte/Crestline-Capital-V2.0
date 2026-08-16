require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Decimal = require('decimal.js');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');
const TransferRequest = require('./models/TransferRequest');
const WithdrawalRequest = require('./models/WithdrawalRequest');
const ProviderWebhookEvent = require('./models/ProviderWebhookEvent');
const { createTransferRecipient, initiateTransfer } = require('./services/paystackTransfers');
const { auth, admin } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
app.use(express.json({ limit: '100kb', verify: (req, _, buf) => { req.rawBody = Buffer.from(buf); } }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
const transferLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many transfer attempts. Please try again later.' } });
const withdrawalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many withdrawal attempts. Please try again later.' } });
const adminWithdrawalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: true, message: { message: 'Too many withdrawal review attempts. Please try again later.' } });
const webhookLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128), pin: z.string().regex(/^\d{4,6}$/) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const transferSchema = z.object({ recipientAccountNumber: z.string().regex(/^\d{10,20}$/), amount: z.number().positive().finite().max(1000000), type: z.enum(['internal', 'external']), description: z.string().max(160).optional(), pin: z.string().regex(/^\d{4,6}$/) });
const withdrawalSchema = z.object({ amount: z.number().positive().finite().max(1000000), pin: z.string().regex(/^\d{4,6}$/), destination: z.object({ type: z.literal('bank'), accountName: z.string().trim().min(2).max(120), accountNumber: z.string().trim().regex(/^\d{6,34}$/), bankCode: z.string().trim().min(2).max(20) }) });
const rejectionSchema = z.object({ reason: z.string().trim().min(3).max(500) });
const feeFor = (amount, type) => type === 'internal' ? new Decimal(0) : Decimal.min(25, Decimal.max(2.5, amount.mul('0.005')));
const withdrawalFeeFor = amount => Decimal.min(1000, Decimal.max(50, amount.mul('0.01')));
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, accountNumber: u.accountNumber, balance: Number(u.balance.toString()), isAdmin: u.isAdmin, isFrozen: u.isFrozen });
const tokenFor = u => jwt.sign({ userId: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
const reference = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const payoutReference = withdrawalReference => `crl_${withdrawalReference.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`.slice(0, 50);
const idempotencyKey = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{16,128}$/.test(value) ? value : null;
const audit = (req, action, targetId, metadata = {}, referenceValue) => AuditLog.create({ actorId: req.user._id, action, targetId, metadata, reference: referenceValue, ip: req.ip, userAgent: req.get('user-agent') || '' });

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    if (await User.exists({ email: data.email.toLowerCase() })) return res.status(409).json({ message: 'Email already registered' });
    let accountNumber;
    do { accountNumber = String(Math.floor(1000000000 + Math.random() * 9000000000)); } while (await User.exists({ accountNumber }));
    const password = await bcrypt.hash(data.password, 12);
    const pin = await bcrypt.hash(data.pin, 12);
    const user = await User.create({ ...data, email: data.email.toLowerCase(), password, pin, accountNumber, balance: mongoose.Types.Decimal128.fromString('0') });
    await AuditLog.create({ actorId: user._id, action: 'AUTH_REGISTER', targetId: user._id, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { res.status(400).json({ message: e.issues?.[0]?.message || 'Invalid registration data' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(data.password, user.password))) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.isFrozen) return res.status(403).json({ message: 'Account is frozen' });
    await AuditLog.create({ actorId: user._id, action: 'AUTH_LOGIN', targetId: user._id, ip: req.ip, userAgent: req.get('user-agent') || '' });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { res.status(400).json({ message: e.issues?.[0]?.message || 'Invalid login data' }); }
});

app.get('/api/user', auth, async (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/transfer/recipient/:accountNumber', auth, async (req, res) => {
  const recipient = await User.findOne({ accountNumber: req.params.accountNumber }).select('name accountNumber isFrozen');
  if (!recipient) return res.status(404).json({ message: 'Recipient account not found' });
  res.json({ recipient: { name: recipient.name, accountNumber: recipient.accountNumber, isFrozen: recipient.isFrozen } });
});

app.post('/api/transfer', auth, transferLimiter, async (req, res) => {
  const key = idempotencyKey(req.get('Idempotency-Key'));
  if (!key) return res.status(400).json({ message: 'A valid Idempotency-Key header is required for transfers' });
  const session = await mongoose.startSession();
  try {
    const data = transferSchema.parse(req.body);
    const amount = new Decimal(String(data.amount));
    if (data.recipientAccountNumber === req.user.accountNumber) return res.status(400).json({ message: 'You cannot transfer to yourself' });
    if (!(await bcrypt.compare(data.pin, req.user.pin))) return res.status(401).json({ message: 'Incorrect transfer PIN' });
    const fee = feeFor(amount, data.type);
    const total = amount.plus(fee);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const daily = await Transaction.aggregate([{ $match: { senderId: req.user._id, createdAt: { $gte: todayStart }, status: 'success' } }, { $group: { _id: null, total: { $sum: { $toDecimal: '$amount' } }, fees: { $sum: { $toDecimal: '$fee' } } } }]);
    const dailyTotal = new Decimal(daily[0]?.total?.toString() || '0');
    if (dailyTotal.plus(amount).gt(100000)) return res.status(400).json({ message: 'Daily transfer limit exceeded' });
    let responsePayload;
    await session.withTransaction(async () => {
      const existing = await TransferRequest.findOne({ userId: req.user._id, key }).session(session);
      if (existing) { responsePayload = existing.response; return; }
      await TransferRequest.create([{ userId: req.user._id, key, statusCode: 102, response: { message: 'Transfer is processing' } }], { session });
      const sender = await User.findById(req.user._id).session(session);
      const receiver = await User.findOne({ accountNumber: data.recipientAccountNumber }).session(session);
      if (!sender || sender.isFrozen) throw Object.assign(new Error('Sender account is frozen or unavailable'), { code: 'SENDER_FROZEN' });
      if (!receiver) throw Object.assign(new Error('Recipient account not found'), { code: 'NOT_FOUND' });
      if (receiver.isFrozen) throw Object.assign(new Error('Recipient account is frozen'), { code: 'RECIPIENT_FROZEN' });
      const senderBalance = new Decimal(sender.balance.toString());
      const receiverBalance = new Decimal(receiver.balance.toString());
      if (senderBalance.lt(total)) throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT' });
      sender.balance = mongoose.Types.Decimal128.fromString(senderBalance.minus(total).toFixed(2));
      receiver.balance = mongoose.Types.Decimal128.fromString(receiverBalance.plus(amount).toFixed(2));
      await sender.save({ session }); await receiver.save({ session });
      const [created] = await Transaction.create([{ senderId: sender._id, receiverId: receiver._id, amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString(fee.toFixed(2)), type: data.type, description: data.description || '', status: 'success', reference: reference('CRL') }], { session });
      responsePayload = { message: 'Transfer completed successfully', reference: created.reference, amount: amount.toNumber(), fee: fee.toNumber(), total: total.toNumber() };
      await TransferRequest.updateOne({ userId: req.user._id, key }, { $set: { statusCode: 201, response: responsePayload } }, { session });
      await AuditLog.create([{ actorId: req.user._id, action: 'TRANSFER_COMPLETED', targetId: receiver._id, reference: created.reference, metadata: { amount: amount.toNumber(), fee: fee.toNumber(), type: data.type }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
    });
    if (!responsePayload) throw new Error('Transfer response unavailable');
    res.status(responsePayload.statusCode || 201).json(responsePayload);
  } catch (e) {
    if (e?.code === 11000) { const existing = await TransferRequest.findOne({ userId: req.user._id, key }); if (existing) return res.status(existing.statusCode === 102 ? 409 : existing.statusCode).json(existing.response); }
    const map = { INSUFFICIENT: 400, NOT_FOUND: 404, RECIPIENT_FROZEN: 403, SENDER_FROZEN: 403 };
    res.status(map[e.code] || (e.issues ? 400 : 500)).json({ message: e.issues?.[0]?.message || e.message || 'Transfer failed' });
  } finally { await session.endSession(); }
});

app.post('/api/withdrawals', auth, withdrawalLimiter, async (req, res) => {
  const key = idempotencyKey(req.get('Idempotency-Key'));
  if (!key) return res.status(400).json({ message: 'A valid Idempotency-Key header is required for withdrawals' });
  const session = await mongoose.startSession();
  try {
    const data = withdrawalSchema.parse(req.body);
    if (!(await bcrypt.compare(data.pin, req.user.pin))) return res.status(401).json({ message: 'Incorrect withdrawal PIN' });
    let responsePayload;
    await session.withTransaction(async () => {
      const existing = await WithdrawalRequest.findOne({ userId: req.user._id, idempotencyKey: key }).session(session);
      if (existing) { responsePayload = { message: 'Withdrawal request already exists', reference: existing.reference, status: existing.status }; return; }
      const user = await User.findById(req.user._id).session(session);
      if (!user || user.isFrozen) throw Object.assign(new Error('Account is frozen or unavailable'), { code: 'FROZEN' });
      const amount = new Decimal(String(data.amount));
      const fee = withdrawalFeeFor(amount);
      const total = amount.plus(fee);
      const balance = new Decimal(user.balance.toString());
      if (balance.lt(total)) throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT' });
      user.balance = mongoose.Types.Decimal128.fromString(balance.minus(total).toFixed(2));
      await user.save({ session });
      const withdrawalReference = reference('WD');
      await WithdrawalRequest.create([{ userId: user._id, amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString(fee.toFixed(2)), netAmount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)), destination: data.destination, status: 'pending', reference: withdrawalReference, idempotencyKey: key }], { session });
      await Transaction.create([{ senderId: user._id, receiverId: user._id, amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString(fee.toFixed(2)), type: 'external', description: 'Withdrawal request', status: 'pending', reference: withdrawalReference }], { session });
      responsePayload = { message: 'Withdrawal request submitted', reference: withdrawalReference, amount: amount.toNumber(), fee: fee.toNumber(), total: total.toNumber(), status: 'pending' };
      await AuditLog.create([{ actorId: user._id, action: 'WITHDRAWAL_REQUESTED', targetId: user._id, reference: withdrawalReference, metadata: { amount: amount.toNumber(), fee: fee.toNumber(), destinationType: data.destination.type }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
    });
    res.status(201).json(responsePayload);
  } catch (e) {
    if (e?.code === 11000) { const existing = await WithdrawalRequest.findOne({ userId: req.user._id, idempotencyKey: key }); if (existing) return res.status(200).json({ message: 'Withdrawal request already exists', reference: existing.reference, status: existing.status }); }
    const map = { INSUFFICIENT: 400, FROZEN: 403 };
    res.status(map[e.code] || (e.issues ? 400 : 500)).json({ message: e.issues?.[0]?.message || e.message || 'Withdrawal failed' });
  } finally { await session.endSession(); }
});

app.get('/api/withdrawals', auth, async (req, res) => {
  const docs = await WithdrawalRequest.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).select('-destination.accountNumber');
  res.json({ withdrawals: docs });
});

app.get('/api/transactions', auth, async (req, res) => {
  const docs = await Transaction.find({ $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] }).sort({ createdAt: -1 }).limit(100).populate('senderId', 'name accountNumber').populate('receiverId', 'name accountNumber');
  res.json({ transactions: docs.map(t => ({ id: t._id, reference: t.reference, amount: Number(t.amount.toString()), fee: Number(t.fee.toString()), type: t.type, status: t.status, description: t.description, createdAt: t.createdAt, direction: t.senderId._id.toString() === req.user._id.toString() ? 'debit' : 'credit', counterparty: t.senderId._id.toString() === req.user._id.toString() ? t.receiverId.name : t.senderId.name })) });
});

app.get('/api/admin/users', auth, admin, async (_, res) => res.json({ users: (await User.find().select('-password -pin').sort({ createdAt: -1 })).map(publicUser) }));
app.get('/api/admin/transactions', auth, admin, async (_, res) => res.json({ transactions: await Transaction.find().sort({ createdAt: -1 }).limit(500) }));
app.patch('/api/admin/users/:id/freeze', auth, admin, async (req, res) => { const user = await User.findByIdAndUpdate(req.params.id, { isFrozen: Boolean(req.body.frozen) }, { new: true }); if (!user) return res.status(404).json({ message: 'User not found' }); await audit(req, user.isFrozen ? 'ADMIN_FREEZE_ACCOUNT' : 'ADMIN_UNFREEZE_ACCOUNT', user._id); res.json({ user: publicUser(user) }); });
app.get('/api/admin/audit-logs', auth, admin, async (_, res) => res.json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(500).populate('actorId', 'name email') }));
app.get('/api/admin/withdrawals', auth, admin, async (_, res) => res.json({ withdrawals: await WithdrawalRequest.find().sort({ createdAt: -1 }).limit(500) }));

app.patch('/api/admin/withdrawals/:reference/approve', auth, admin, adminWithdrawalLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let response;
    await session.withTransaction(async () => {
      const withdrawal = await WithdrawalRequest.findOne({ reference: req.params.reference }).session(session);
      if (!withdrawal) throw Object.assign(new Error('Withdrawal request not found'), { code: 'NOT_FOUND' });
      if (withdrawal.status !== 'pending') throw Object.assign(new Error(`Withdrawal is already ${withdrawal.status}`), { code: 'FINALIZED' });
      const transaction = await Transaction.findOne({ reference: withdrawal.reference }).session(session);
      if (!transaction || transaction.status !== 'pending') throw Object.assign(new Error('Withdrawal transaction is unavailable'), { code: 'TX_STATE' });
      withdrawal.status = 'approved';
      withdrawal.approvedBy = req.user._id;
      withdrawal.approvedAt = new Date();
      await withdrawal.save({ session });
      transaction.status = 'success';
      await transaction.save({ session });
      await AuditLog.create([{ actorId: req.user._id, action: 'WITHDRAWAL_APPROVED', targetId: withdrawal.userId, reference: withdrawal.reference, metadata: { amount: withdrawal.amount.toString(), fee: withdrawal.fee.toString() }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
    });

    const withdrawal = await WithdrawalRequest.findOne({ reference: req.params.reference });
    try {
      const recipient = await createTransferRecipient({ name: withdrawal.destination.accountName, accountNumber: withdrawal.destination.accountNumber, bankCode: withdrawal.destination.bankCode, currency: 'NGN' });
      const transfer = await initiateTransfer({ amount: Math.round(Number(withdrawal.netAmount.toString()) * 100), recipientCode: recipient.recipient_code, reference: payoutReference(withdrawal.reference), reason: `Crestline withdrawal ${withdrawal.reference}`, currency: 'NGN' });
      await WithdrawalRequest.updateOne({ _id: withdrawal._id, status: 'approved' }, { $set: { provider: 'paystack', providerReference: transfer.reference, providerTransferCode: transfer.transfer_code, providerStatus: transfer.status || 'pending', payoutInitiatedAt: new Date() } });
      await AuditLog.create({ actorId: req.user._id, action: 'WITHDRAWAL_PAYOUT_INITIATED', targetId: withdrawal.userId, reference: withdrawal.reference, metadata: { provider: 'paystack', providerReference: transfer.reference, transferCode: transfer.transfer_code } , ip: req.ip, userAgent: req.get('user-agent') || '' });
      response = { message: 'Withdrawal approved and payout initiated', reference: withdrawal.reference, status: 'approved', providerStatus: transfer.status || 'pending' };
    } catch (providerError) {
      await WithdrawalRequest.updateOne({ _id: withdrawal._id, status: 'approved' }, { $set: { provider: 'paystack', providerStatus: 'failed', providerError: String(providerError.message || providerError).slice(0, 1000) } });
      await AuditLog.create({ actorId: req.user._id, action: 'WITHDRAWAL_PAYOUT_INITIATION_FAILED', targetId: withdrawal.userId, reference: withdrawal.reference, metadata: { error: String(providerError.message || providerError).slice(0, 500) }, ip: req.ip, userAgent: req.get('user-agent') || '' });
      return res.status(502).json({ message: 'Withdrawal approved but payout could not be initiated; manual review required', reference: withdrawal.reference, status: 'approved' });
    }
    res.json(response);
  } catch (e) {
    const map = { NOT_FOUND: 404, FINALIZED: 409, TX_STATE: 409 };
    res.status(map[e.code] || 500).json({ message: e.message || 'Withdrawal approval failed' });
  } finally { await session.endSession(); }
});

app.patch('/api/admin/withdrawals/:reference/reject', auth, admin, adminWithdrawalLimiter, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const data = rejectionSchema.parse(req.body);
    let response;
    await session.withTransaction(async () => {
      const withdrawal = await WithdrawalRequest.findOne({ reference: req.params.reference }).session(session);
      if (!withdrawal) throw Object.assign(new Error('Withdrawal request not found'), { code: 'NOT_FOUND' });
      if (withdrawal.status !== 'pending') throw Object.assign(new Error(`Withdrawal is already ${withdrawal.status}`), { code: 'FINALIZED' });
      const user = await User.findById(withdrawal.userId).session(session);
      if (!user) throw Object.assign(new Error('Withdrawal owner not found'), { code: 'USER_NOT_FOUND' });
      const transaction = await Transaction.findOne({ reference: withdrawal.reference }).session(session);
      if (!transaction || transaction.status !== 'pending') throw Object.assign(new Error('Withdrawal transaction is unavailable'), { code: 'TX_STATE' });
      const balance = new Decimal(user.balance.toString());
      const refund = new Decimal(withdrawal.amount.toString()).plus(new Decimal(withdrawal.fee.toString()));
      user.balance = mongoose.Types.Decimal128.fromString(balance.plus(refund).toFixed(2));
      await user.save({ session });
      withdrawal.status = 'rejected';
      withdrawal.rejectionReason = data.reason;
      await withdrawal.save({ session });
      transaction.status = 'failed';
      transaction.description = `Withdrawal rejected: ${data.reason}`;
      await transaction.save({ session });
      await AuditLog.create([{ actorId: req.user._id, action: 'WITHDRAWAL_REJECTED', targetId: withdrawal.userId, reference: withdrawal.reference, metadata: { amount: withdrawal.amount.toString(), fee: withdrawal.fee.toString(), reason: data.reason }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
      response = { message: 'Withdrawal rejected and funds restored', reference: withdrawal.reference, status: withdrawal.status };
    });
    res.json(response);
  } catch (e) {
    const map = { NOT_FOUND: 404, FINALIZED: 409, USER_NOT_FOUND: 404, TX_STATE: 409 };
    res.status(map[e.code] || (e.issues ? 400 : 500)).json({ message: e.issues?.[0]?.message || e.message || 'Withdrawal rejection failed' });
  } finally { await session.endSession(); }
});

app.post('/api/paystack/webhook', webhookLimiter, async (req, res) => {
  try {
    const signature = req.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!signature || !secret || !req.rawBody) return res.status(401).json({ message: 'Invalid webhook signature' });
    const expected = crypto.createHmac('sha512', secret).update(req.rawBody).digest('hex');
    const provided = String(signature).toLowerCase();
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = /^[a-f0-9]{128}$/i.test(provided) ? Buffer.from(provided, 'hex') : Buffer.alloc(0);
    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return res.status(401).json({ message: 'Invalid webhook signature' });

    const event = req.body;
    const eventId = event?.data?.id ? `paystack:${event.event}:${event.data.id}` : `paystack:${event.event}:${crypto.createHash('sha256').update(req.rawBody).digest('hex')}`;
    const referenceValue = event?.data?.reference;
    try {
      await ProviderWebhookEvent.create({ provider: 'paystack', eventId, event: event.event || 'unknown', reference: referenceValue, status: 'received' });
    } catch (e) {
      if (e?.code === 11000) return res.status(200).json({ received: true, duplicate: true });
      throw e;
    }

    const terminalFailure = event.event === 'transfer.failed' || event.event === 'transfer.reversed';
    const success = event.event === 'transfer.success';
    const withdrawal = referenceValue ? await WithdrawalRequest.findOne({ providerReference: referenceValue }) : null;
    if (!withdrawal) {
      await ProviderWebhookEvent.updateOne({ eventId }, { $set: { status: 'ignored', processedAt: new Date() } });
      return res.status(200).json({ received: true });
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await WithdrawalRequest.findById(withdrawal._id).session(session);
        if (!current) return;
        if (success && current.status === 'approved') {
          current.status = 'paid';
          current.providerStatus = 'success';
          current.paidAt = new Date();
          await current.save({ session });
          await Transaction.updateOne({ reference: current.reference, status: 'success' }, { $set: { description: 'Withdrawal paid via Paystack' } }, { session });
          await AuditLog.create([{ action: 'WITHDRAWAL_PAID', targetId: current.userId, reference: current.reference, metadata: { provider: 'paystack', providerReference: referenceValue, transferCode: event.data.transfer_code }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
        } else if (terminalFailure && current.status === 'approved') {
          const user = await User.findById(current.userId).session(session);
          if (!user) throw new Error('Withdrawal owner not found');
          const balance = new Decimal(user.balance.toString());
          const refund = new Decimal(current.amount.toString()).plus(new Decimal(current.fee.toString()));
          user.balance = mongoose.Types.Decimal128.fromString(balance.plus(refund).toFixed(2));
          await user.save({ session });
          current.status = 'rejected';
          current.providerStatus = event.event === 'transfer.reversed' ? 'reversed' : 'failed';
          current.providerError = String(event.data?.failures || event.data?.reason || event.event).slice(0, 1000);
          await current.save({ session });
          await Transaction.updateOne({ reference: current.reference, status: 'success' }, { $set: { status: 'failed', description: `Withdrawal payout ${event.event}; funds restored` } }, { session });
          await AuditLog.create([{ action: 'WITHDRAWAL_PAYOUT_FAILED', targetId: current.userId, reference: current.reference, metadata: { provider: 'paystack', providerReference: referenceValue, event: event.event }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
        }
        await ProviderWebhookEvent.updateOne({ eventId }, { $set: { status: 'processed', processedAt: new Date() } }, { session });
      });
    } finally { await session.endSession(); }
    return res.status(200).json({ received: true });
  } catch (e) {
    try { if (req.body?.data?.reference) await ProviderWebhookEvent.updateOne({ provider: 'paystack', reference: req.body.data.reference, status: 'received' }, { $set: { status: 'failed', error: String(e.message || e).slice(0, 1000) } }); } catch (_) {}
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
});

if (require.main === module) {
  const port = process.env.PORT || 4000;
  mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`Crestline API listening on ${port}`))).catch(err => { console.error('MongoDB connection failed', err); process.exit(1); });
}

module.exports = app;
