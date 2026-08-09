import { NextResponse } from 'next/server';
import { connectMongo, User, Transaction, authenticatedUser } from '@/lib/server-banking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectMongo();
    const user = await authenticatedUser(request);
    const docs = await Transaction.find({
      $or: [{ senderId: user._id }, { receiverId: user._id }],
    })
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(100)
      .populate('senderId', 'name accountNumber')
      .populate('receiverId', 'name accountNumber');

    const userId = user._id.toString();
    const transactions = docs.map((t: any) => {
      const sender = t.senderId && typeof t.senderId === 'object' ? t.senderId : null;
      const receiver = t.receiverId && typeof t.receiverId === 'object' ? t.receiverId : null;
      const senderId = sender?._id?.toString();
      const receiverId = receiver?._id?.toString();
      const isDebit = senderId === userId;
      const isCredit = receiverId === userId;

      // Manual admin credits have no sender; manual admin debits have no receiver.
      // Use the stored direction for these ledger entries instead of dereferencing null.
      const direction = isDebit ? 'debit' : isCredit ? 'credit' : (t.direction || 'credit');
      const counterparty = isDebit
        ? receiver?.name || 'Crestline Capital'
        : sender?.name || 'Crestline Capital';

      return {
        id: t._id.toString(),
        reference: t.reference,
        amount: Number(t.amount?.toString() || 0),
        fee: Number(t.fee?.toString() || 0),
        type: t.type,
        status: t.status,
        description: t.description || (t.adminCreated ? 'Account adjustment' : ''),
        createdAt: t.occurredAt || t.createdAt,
        direction,
        counterparty,
        affectsBalance: t.affectsBalance !== false,
        displayOnly: Boolean(t.displayOnly),
        adminCreated: Boolean(t.adminCreated),
      };
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { message: error?.message === 'UNAUTHORIZED' ? 'Authentication required' : 'Unable to load transactions' },
      { status: error?.message === 'UNAUTHORIZED' ? 401 : 503 },
    );
  }
}
