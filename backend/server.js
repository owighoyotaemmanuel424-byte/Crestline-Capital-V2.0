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
const { auth, admin } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
const transferLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many transfer attempts. Please try again later.' } });

const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128), pin: z.string().regex(/^\d{4,6}$/) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const transferSchema = z.object({ recipientAccountNumber: z.string().regex(/^\d{10,20}$/), amount: z.number().positive().finite().max(1000000), type: z.enum(['internal', 'external']), description: z.string().max(160).optional(), pin: z.string().regex(/^\d{4,6}$/) });
const feeFor = (amount, type) => type === 'internal' ? new Decimal(0) : Decimal.min(25, Decimal.max(2.5, amount.mul('0.005')));
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, accountNumber: u.accountNumber, balance: Number(u.balance.toString()), isAdmin: u.isAdmin, isFrozen: u.isFrozen });
const tokenFor = u => jwt.sign({ userId: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
const reference = () => `CRL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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
      await sender.save({ session });
      await receiver.save({ session });
      const [created] = await Transaction.create([{ senderId: sender._id, receiverId: receiver._id, amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString(fee.toFixed(2)), type: data.type, description: data.description || '', status: 'success', reference: reference() }], { session });
      responsePayload = { message: 'Transfer completed successfully', reference: created.reference, amount: amount.toNumber(), fee: fee.toNumber(), total: total.toNumber() };
      await TransferRequest.updateOne({ userId: req.user._id, key }, { $set: { statusCode: 201, response: responsePayload } }, { session });
      await AuditLog.create([{ actorId: req.user._id, action: 'TRANSFER_COMPLETED', targetId: receiver._id, reference: created.reference, metadata: { amount: amount.toNumber(), fee: fee.toNumber(), type: data.type }, ip: req.ip, userAgent: req.get('user-agent') || '' }], { session });
    });
    if (!responsePayload) throw new Error('Transfer response unavailable');
    res.status(responsePayload.statusCode || 201).json(responsePayload);
  } catch (e) {
    if (e?.code === 11000) {
      const existing = await TransferRequest.findOne({ userId: req.user._id, key });
      if (existing) return res.status(existing.statusCode === 102 ? 409 : existing.statusCode).json(existing.response);
    }
    const map = { INSUFFICIENT: 400, NOT_FOUND: 404, RECIPIENT_FROZEN: 403, SENDER_FROZEN: 403 };
    res.status(map[e.code] || (e.issues ? 400 : 500)).json({ message: e.issues?.[0]?.message || e.message || 'Transfer failed' });
  } finally { await session.endSession(); }
});

app.get('/api/transactions', auth, async (req, res) => {
  const docs = await Transaction.find({ $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] }).sort({ createdAt: -1 }).limit(100).populate('senderId', 'name accountNumber').populate('receiverId', 'name accountNumber');
  res.json({ transactions: docs.map(t => ({ id: t._id, reference: t.reference, amount: Number(t.amount.toString()), fee: Number(t.fee.toString()), type: t.type, status: t.status, description: t.description, createdAt: t.createdAt, direction: t.senderId._id.toString() === req.user._id.toString() ? 'debit' : 'credit', counterparty: t.senderId._id.toString() === req.user._id.toString() ? t.receiverId.name : t.senderId.name })) });
});

app.get('/api/admin/users', auth, admin, async (_, res) => res.json({ users: (await User.find().select('-password -pin').sort({ createdAt: -1 })).map(publicUser) }));
app.get('/api/admin/transactions', auth, admin, async (_, res) => res.json({ transactions: await Transaction.find().sort({ createdAt: -1 }).limit(500) }));
app.patch('/api/admin/users/:id/freeze', auth, admin, async (req, res) => { const user = await User.findByIdAndUpdate(req.params.id, { isFrozen: Boolean(req.body.frozen) }, { new: true }); if (!user) return res.status(404).json({ message: 'User not found' }); await audit(req, user.isFrozen ? 'ADMIN_FREEZE_ACCOUNT' : 'ADMIN_UNFREEZE_ACCOUNT', user._id); res.json({ user: publicUser(user) }); });
app.get('/api/admin/audit-logs', auth, admin, async (_, res) => res.json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(500).populate('actorId', 'name email') }));

// Keep local development working while also allowing Vercel to import the Express app.
if (require.main === module) {
  const port = process.env.PORT || 4000;
  mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`Crestline API listening on ${port}`))).catch(err => { console.error('MongoDB connection failed', err); process.exit(1); });
}

module.exports = app;
