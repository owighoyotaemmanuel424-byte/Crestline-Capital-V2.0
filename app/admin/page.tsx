"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import Navbar from '@/components/admin/Navbar';
import MetricsGrid from '@/components/admin/MetricsGrid';
import UsersTable from '@/components/admin/UsersTable';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  balance: number;
  isFrozen: boolean;
  kycStatus?: 'verified' | 'pending' | 'rejected';
  createdAt?: string;
};

type Metrics = {
  totalDeposits: number;
  pendingDeposits: number;
  totalTransfers: number;
  pendingTransfers: number;
  totalUsers: number;
  blockedUsers: number;
  updatedAt?: string;
};

type Transaction = {
  _id: string;
  reference: string;
  amount: unknown;
  type: string;
  status: string;
  createdAt: string;
  description?: string;
};

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const decimal = (value: unknown) => Number(typeof value === 'object' && value !== null && '$numberDecimal' in value ? (value as { $numberDecimal: string }).$numberDecimal : value || 0);

export default function AdminPage() {
  const router = useRouter();
  const { user, setUser, clear } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ totalDeposits: 0, pendingDeposits: 0, totalTransfers: 0, pendingTransfers: 0, totalUsers: 0, blockedUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [me, metricsResponse, usersResponse, transactionsResponse] = await Promise.all([
        api.get('/user'),
        api.get('/admin/metrics'),
        api.get('/admin/users'),
        api.get('/admin/transactions'),
      ]);
      const currentUser = me.data.user;
      if (!currentUser.isAdmin) {
        clear();
        router.replace('/dashboard');
        return;
      }
      setUser(currentUser);
      setMetrics(metricsResponse.data.metrics);
      setUsers(usersResponse.data.users);
      setTransactions(transactionsResponse.data.transactions);
      setLastUpdated(metricsResponse.data.metrics.updatedAt || new Date().toISOString());
      setError('');
    } catch (requestError: any) {
      if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
        router.replace('/dashboard');
        return;
      }
      setError(requestError?.response?.data?.message || 'Unable to load admin data.');
    } finally {
      if (initial) setLoading(false);
    }
  }, [clear, router, setUser]);

  useEffect(() => {
    void load(true);
    const interval = window.setInterval(() => void load(false), 15000);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Overview</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}</h2>
            <p className="mt-1 text-sm text-slate-500">Monitor customer accounts, money movement and operational risk from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View deposits</button>
            <button onClick={() => document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View transfers</button>
            <button onClick={() => document.getElementById('users')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800">Manage users</button>
          </div>
        </section>

        {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div>
        ) : (
          <MetricsGrid metrics={metrics} />
        )}

        <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Customers</p><p className="mt-2 text-2xl font-bold">{metrics.totalUsers}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Blocked</p><p className="mt-2 text-2xl font-bold text-red-600">{metrics.blockedUsers}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Transactions</p><p className="mt-2 text-2xl font-bold">{transactions.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">Live status</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Updating every 15s</p></div>
        </section>

        <div id="users" className="mt-6 scroll-mt-24"><UsersTable users={users} onUpdated={setUsers} /></div>

        <section id="transactions" className="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="text-lg font-bold">Transaction visibility</h2><p className="mt-1 text-sm text-slate-500">Latest deposits and transfers recorded by the banking ledger.</p></div>
            {lastUpdated ? <span className="hidden text-xs text-slate-400 sm:block">Updated {new Date(lastUpdated).toLocaleTimeString()}</span> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 50).map((tx) => <tr key={tx._id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">{tx.reference}</td><td className="px-5 py-4 capitalize text-slate-600">{tx.type}</td><td className="px-5 py-4 font-semibold">{money(decimal(tx.amount))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tx.status === 'success' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{tx.status}</span></td><td className="px-5 py-4 text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td></tr>)}
              </tbody>
            </table>
            {!transactions.length ? <div className="p-10 text-center text-sm text-slate-500">No transactions recorded yet.</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
