require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const { auth, admin } = require('./middleware/auth');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: z.string().min(8).max(128), pin: z.string().regex(/^\d{4,6}$/) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const transferSchema = z.object({ recipientAccountNumber: z.string().regex(/^\d{10,20}$/), amount: z.number().positive().finite().max(1000000), type: z.enum(['internal', 'external']), description: z.string().max(160).optional(), pin: z.string().regex(/^\d{4,6}$/) });
const feeFor = (amount, type) => type === 'internal' ? 0 : Math.min(25, Math.max(2.5, amount * 0.005));
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, accountNumber: u.accountNumber, balance: Number(u.balance.toString()), isAdmin: u.isAdmin, isFrozen: u.isFrozen });
const tokenFor = u => jwt.sign({ userId: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
const reference = () => `CRL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

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
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { res.status(400).json({ message: e.issues?.[0]?.message || 'Invalid registration data' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(data.password, user.password))) return res.status(401).json({ message: 'Invalid email or password' });
    if (user.isFrozen) return res.status(403).json({ message: 'Account is frozen' });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (e) { res.status(400).json({ message: e.issues?.[0]?.message || 'Invalid login data' }); }
});

app.get('/api/user', auth, async (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/transfer/recipient/:accountNumber', auth, async (req, res) => {
  const recipient = await User.findOne({ accountNumber: req.params.accountNumber }).select('name accountNumber isFrozen');
  if (!recipient) return res.status(404).json({ message: 'Recipient account not found' });
  res.json({ recipient: { name: recipient.name, accountNumber: recipient.accountNumber, isFrozen: recipient.isFrozen } });
});

app.post('/api/transfer', auth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const data = transferSchema.parse(req.body);
    if (data.recipientAccountNumber === req.user.accountNumber) return res.status(400).json({ message: 'You cannot transfer to yourself' });
    if (!(await bcrypt.compare(data.pin, req.user.pin))) return res.status(401).json({ message: 'Incorrect transfer PIN' });
    const fee = feeFor(data.amount, data.type);
    const total = data.amount + fee;
    let created;
    await session.withTransaction(async () => {
      const sender = await User.findById(req.user._id).session(session);
      const receiver = await User.findOne({ accountNumber: data.recipientAccountNumber }).session(session);
      if (!receiver) throw Object.assign(new Error('Recipient account not found'), { code: 'NOT_FOUND' });
      if (receiver.isFrozen) throw Object.assign(new Error('Recipient account is frozen'), { code: 'RECIPIENT_FROZEN' });
      const balance = Number(sender.balance.toString());
      if (balance < total) throw Object.assign(new Error('Insufficient balance'), { code: 'INSUFFICIENT' });
      sender.balance = mongoose.Types.Decimal128.fromString((balance - total).toFixed(2));
      receiver.balance = mongoose.Types.Decimal128.fromString((Number(receiver.balance.toString()) + data.amount).toFixed(2));
      await sender.save({ session }); await receiver.save({ session });
      [created] = await Transaction.create([{ senderId: sender._id, receiverId: receiver._id, amount: mongoose.Types.Decimal128.fromString(data.amount.toFixed(2)), fee: mongoose.Types.Decimal128.fromString(fee.toFixed(2)), type: data.type, description: data.description || '', status: 'success', reference: reference() }], { session });
    });
    res.status(201).json({ message: 'Transfer completed successfully', reference: created.reference, amount: data.amount, fee, total: Number(total.toFixed(2)) });
  } catch (e) {
    const map = { INSUFFICIENT: 400, NOT_FOUND: 404, RECIPIENT_FROZEN: 403 };
    res.status(map[e.code] || (e.issues ? 400 : 500)).json({ message: e.issues?.[0]?.message || e.message || 'Transfer failed' });
  } finally { await session.endSession(); }
});

app.get('/api/transactions', auth, async (req, res) => {
  const docs = await Transaction.find({ $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] }).sort({ createdAt: -1 }).limit(100).populate('senderId', 'name accountNumber').populate('receiverId', 'name accountNumber');
  res.json({ transactions: docs.map(t => ({ id: t._id, reference: t.reference, amount: Number(t.amount.toString()), fee: Number(t.fee.toString()), type: t.type, status: t.status, description: t.description, createdAt: t.createdAt, direction: t.senderId._id.toString() === req.user._id.toString() ? 'debit' : 'credit', counterparty: t.senderId._id.toString() === req.user._id.toString() ? t.receiverId.name : t.senderId.name })) });
});

app.get('/api/admin/users', auth, admin, async (_, res) => res.json({ users: (await User.find().select('-password -pin').sort({ createdAt: -1 })).map(publicUser) }));
app.get('/api/admin/transactions', auth, admin, async (_, res) => res.json({ transactions: await Transaction.find().sort({ createdAt: -1 }).limit(500) }));
app.patch('/api/admin/users/:id/freeze', auth, admin, async (req, res) => { const user = await User.findByIdAndUpdate(req.params.id, { isFrozen: Boolean(req.body.frozen) }, { new: true }); if (!user) return res.status(404).json({ message: 'User not found' }); res.json({ user: publicUser(user) }); });

const port = process.env.PORT || 4000;
mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`Crestline API listening on ${port}`))).catch(err => { console.error('MongoDB connection failed', err); process.exit(1); });
