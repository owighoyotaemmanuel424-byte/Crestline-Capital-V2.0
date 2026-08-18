"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CreditCard, PlusCircle, ArrowLeft } from "lucide-react";

export default function CardsPage() {
  const data = useQuery(api.cards.mine);
  const apply = useMutation(api.cards.apply);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const blocked = Boolean(data?.cards.some((card) => ["pending", "active", "frozen"].includes(card.status)));

  async function requestCard() {
    setLoading(true); setError(""); setMessage("");
    try { const result = await apply({ type: "virtual", brand: "visa" }); setMessage(result.message); }
    catch (e: any) { setError(e?.message === "CARD_ALREADY_EXISTS" ? "You already have a pending or active card." : "Unable to submit your card application."); }
    finally { setLoading(false); }
  }

  if (data === undefined) return <main className="min-h-screen p-6"><div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8">Loading your cards…</div></main>;
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-3xl">
    <a href="/dashboard" className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16}/> Back to dashboard</a>
    <section className="mt-6 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 p-6 text-white shadow-lg sm:p-8">
      <CreditCard size={32}/><h1 className="mt-4 text-3xl font-bold">Your Cards</h1><p className="mt-2 text-white/85">Manage your Crestline Capital cards securely.</p>
      <div className="mt-6 rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-wider text-white/70">Available balance</p><p className="mt-1 text-2xl font-bold">{data.balance.toLocaleString(undefined,{minimumFractionDigits:2})} {data.currency}</p></div>
      <button disabled={loading || blocked} onClick={() => void requestCard()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 font-bold text-slate-900 disabled:opacity-60"><PlusCircle size={18}/>{loading ? "Submitting…" : blocked ? "Card Application Pending" : "Apply for Virtual Card"}</button>
    </section>
    {message && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
    {error && <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <section className="mt-6 space-y-3"><h2 className="text-xl font-bold">Your cards</h2>{data.cards.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">No cards yet.</div> : data.cards.map(card => <article key={card._id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="font-semibold capitalize">{card.type} · {card.brand}</p><p className="mt-1 font-mono text-sm text-slate-500">•••• •••• •••• {card.last4}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{card.status}</span></div><p className="mt-3 text-sm text-slate-500">Spending limit: {card.spendingLimit.toLocaleString(undefined,{minimumFractionDigits:2})} {data.currency}</p></article>)}</section>
  </div></main>;
}
