"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Navbar from "@/components/admin/Navbar";
import MetricsGrid from "@/components/admin/MetricsGrid";
import UsersTable from "@/components/admin/UsersTable";

const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPage() {
  const router = useRouter();
  const data = useQuery(api.adminDashboard.overview);
  const me = useQuery(api.users.me);
  const setFrozen = useMutation(api.admin.setFrozen);
  const [error, setError] = useState("");

  useEffect(() => { if (me && me.role !== "ADMIN") router.replace("/dashboard"); }, [me, router]);
  if (data === undefined || me === undefined) return <div className="min-h-screen bg-slate-50 p-8">Loading admin console…</div>;
  if (!me || me.role !== "ADMIN") return null;

  const users = data.users.map(u => ({ id: u._id, name: u.name, email: u.email, accountNumber: u.accountNumber, balance: 0, isFrozen: u.isFrozen, createdAt: new Date(u.createdAt).toISOString() }));
  const metrics = data.metrics;
  const onFreeze = async (id: string, frozen: boolean) => { try { await setFrozen({ userId: id as any, frozen }); } catch { setError("Unable to update account status."); } };

  return <div className="min-h-screen bg-slate-50 text-slate-950"><Navbar/><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Overview</p><h2 className="mt-2 text-2xl font-bold">Welcome back, {me.name.split(" ")[0]}</h2><p className="mt-1 text-sm text-slate-500">Monitor customer accounts and money movement.</p></section>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <MetricsGrid metrics={metrics}/>
    <section className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4"><div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase text-slate-500">Customers</p><p className="mt-2 text-2xl font-bold">{metrics.totalUsers}</p></div><div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase text-slate-500">Blocked</p><p className="mt-2 text-2xl font-bold text-red-600">{metrics.blockedUsers}</p></div><div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase text-slate-500">Transactions</p><p className="mt-2 text-2xl font-bold">{data.transactions.length}</p></div><div className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs uppercase text-slate-500">Last update</p><p className="mt-2 text-sm font-semibold">{new Date(metrics.updatedAt).toLocaleTimeString()}</p></div></section>
    <div className="mt-6"><UsersTable users={users} onUpdated={() => {}} onToggleFreeze={onFreeze}/></div>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-lg font-bold">Transaction visibility</h2><p className="mt-1 text-sm text-slate-500">Latest ledger activity.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y">{data.transactions.slice(0,50).map(tx => <tr key={tx._id}><td className="px-5 py-4 font-semibold">{tx.reference}</td><td className="px-5 py-4 capitalize">{tx.type}</td><td className="px-5 py-4 font-semibold">{money(tx.amount)}</td><td className="px-5 py-4">{tx.status}</td><td className="px-5 py-4 text-slate-500">{new Date(tx.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div></section>
  </main></div>;
}
