"use client";

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';

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

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function UsersTable({ users, onUpdated }: { users: AdminUser[]; onUpdated: (users: AdminUser[]) => void }) {
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => `${user.name} ${user.email} ${user.accountNumber}`.toLowerCase().includes(value));
  }, [query, users]);

  async function toggleFreeze(user: AdminUser) {
    setBusyId(user.id);
    try {
      const response = await api.patch(`/admin/users/${user.id}/freeze`, { frozen: !user.isFrozen });
      const updated = response.data.user;
      onUpdated(users.map((item) => item.id === user.id ? { ...item, ...updated } : item));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Recent users</h2>
          <p className="mt-1 text-sm text-slate-500">Manage customer account access and review status.</p>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white sm:w-64" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">KYC status</th>
              <th className="px-5 py-3 font-semibold">Date created</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((user) => {
              const kyc = user.kycStatus || 'pending';
              return (
                <tr key={user.id} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{user.email}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{user.name} · {user.accountNumber}</div>
                  </td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.isFrozen ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{user.isFrozen ? 'Blocked' : 'Active'}</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${kyc === 'verified' ? 'bg-emerald-50 text-emerald-700' : kyc === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{kyc === 'verified' ? 'Verified' : kyc === 'rejected' ? 'Rejected' : 'Pending'}</span></td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-4 text-right"><button disabled={busyId === user.id} onClick={() => toggleFreeze(user)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{busyId === user.id ? 'Saving…' : user.isFrozen ? 'Unblock' : 'Block'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No users match your search.</div> : null}
      </div>
    </section>
  );
}
