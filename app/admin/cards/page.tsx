"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Card = {
  _id?: string;
  id?: string;
  userName?: string;
  userEmail?: string;
  last4?: string;
  brand?: string;
  type?: string;
  status?: string;
  spendingLimit?: number;
  createdAt?: string;
};

const money = (v: number) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function AdminCardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await api.get("/admin/cards");
      setCards(response.data.cards || []);
      setMessage("");
    } catch (error: any) {
      if (error?.response?.status === 404) setMessage("Card management API is not configured yet. The console is ready for the card-service endpoint.");
      else setMessage(error?.response?.data?.message || "Unable to load cards.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => cards.filter(card => {
    const haystack = `${card.userName || ""} ${card.userEmail || ""} ${card.last4 || ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (status === "all" || String(card.status).toLowerCase() === status);
  }), [cards, query, status]);

  const counts = useMemo(() => ({
    total: cards.length,
    active: cards.filter(c => String(c.status).toLowerCase() === "active").length,
    frozen: cards.filter(c => String(c.status).toLowerCase() === "frozen").length,
    revoked: cards.filter(c => String(c.status).toLowerCase() === "revoked").length,
  }), [cards]);

  async function action(card: Card, nextStatus: string) {
    const id = card._id || card.id;
    if (!id) return;
    try {
      await api.patch(`/admin/cards/${id}`, { status: nextStatus });
      setCards(current => current.map(c => (c._id || c.id) === id ? { ...c, status: nextStatus } : c));
    } catch (error: any) { setMessage(error?.response?.data?.message || "Card action failed."); }
  }

  return <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-sky-400">Money / Cards</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Cards Management</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Review issued cards, control card status, monitor limits and manage customer card access.</p></div>
        <button onClick={() => void load()} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800">Refresh</button>
      </div>
      {message && <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{message}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Total cards', counts.total], ['Active', counts.active], ['Frozen', counts.frozen], ['Revoked', counts.revoked]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></div>)}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, email or last 4" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-sky-500 md:max-w-md"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="frozen">Frozen</option><option value="revoked">Revoked</option></select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Card</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Limit</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{loading ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Loading cards…</td></tr> : filtered.map(card => <tr key={card._id || card.id} className="hover:bg-slate-800/30"><td className="px-5 py-4"><b>{card.userName || "Unknown customer"}</b><div className="text-xs text-slate-500">{card.userEmail || ""}</div></td><td className="px-5 py-4 font-mono">•••• {card.last4 || "----"}</td><td className="px-5 py-4 capitalize text-slate-400">{card.type || card.brand || "virtual"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${String(card.status).toLowerCase()==='active'?'bg-emerald-500/10 text-emerald-300':String(card.status).toLowerCase()==='frozen'?'bg-amber-500/10 text-amber-300':'bg-rose-500/10 text-rose-300'}`}>{card.status || "unknown"}</span></td><td className="px-5 py-4">{money(Number(card.spendingLimit || 0))}</td><td className="px-5 py-4"><div className="flex gap-2">{String(card.status).toLowerCase() === "active" ? <button onClick={()=>void action(card,"frozen")} className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">Freeze</button> : String(card.status).toLowerCase() === "frozen" ? <button onClick={()=>void action(card,"active")} className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">Unfreeze</button> : null}{String(card.status).toLowerCase() !== "revoked" && <button onClick={()=>void action(card,"revoked")} className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">Revoke</button>}</div></td></tr>)}{!loading && !filtered.length && <tr><td colSpan={6} className="p-12 text-center text-slate-500">No cards match your filters.</td></tr>}</tbody></table></div>
      </div>
    </div>
  </div>;
}
