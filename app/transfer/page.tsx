"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, UserRound, Building2, Globe2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";

type TransferType = "internal" | "external" | "international";
type Recipient = { name: string; accountNumber: string; bank?: string };

const typeCopy: Record<TransferType, { title: string; subtitle: string }> = {
  internal: { title: "Internal Transfer", subtitle: "Crestline Capital → Crestline Capital" },
  external: { title: "Bank Transfer", subtitle: "Crestline Capital → external bank" },
  international: { title: "International Transfer", subtitle: "Crestline Capital → international bank" },
};

function mask(value: string) { return value ? `•••• •••• ${value.replace(/\s/g, "").slice(-4)}` : "••••"; }
function key() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export default function TransferPage() {
  const auth = useAuth();
  const [type, setType] = useState<TransferType>("internal");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("Personal");
  const [pin, setPin] = useState("");
  const [bank, setBank] = useState("");
  const [country, setCountry] = useState("");
  const [swift, setSwift] = useState("");
  const [iban, setIban] = useState("");
  const [routing, setRouting] = useState("");
  const [step, setStep] = useState<"details" | "review" | "success">("details");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await api.get("/user"); auth.setUser(r.data.user); }
      catch { window.location.href = "/login"; }
      finally { setLoading(false); }
    })();
  }, [auth]);

  const user = auth.user;
  const numericAmount = Number(amount);
  const fee = useMemo(() => type === "internal" ? 0 : Math.min(25, Math.max(2.5, numericAmount > 0 ? numericAmount * 0.005 : 0)), [type, numericAmount]);
  const total = (Number.isFinite(numericAmount) ? numericAmount : 0) + fee;

  async function verifyRecipient() {
    setError(""); setRecipient(null);
    if (!/^\d{10,20}$/.test(accountNumber)) { setError("Enter a valid Crestline account number (10–20 digits)."); return; }
    setChecking(true);
    try {
      const r = await api.get(`/transfer/recipient/${encodeURIComponent(accountNumber)}`);
      if (r.data.recipient?.isFrozen) throw new Error("This recipient account is unavailable.");
      setRecipient(r.data.recipient);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message || "Recipient could not be verified."); }
    finally { setChecking(false); }
  }

  function validate() {
    if (!user) return "Your session has expired. Please sign in again.";
    if (type !== "internal") return "External and international transfers are not enabled by the current backend. No money will be moved. Configure the bank-provider integration before enabling these options in production.";
    if (!recipient) return "Verify the Crestline recipient before continuing.";
    if (recipient.accountNumber === user.accountNumber) return "You cannot transfer money to your own account.";
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "Enter an amount greater than zero.";
    if (numericAmount > 100000) return "This exceeds the current server transfer limit.";
    if (total > Number(user.balance)) return "Insufficient available balance.";
    if (description.length > 160) return "Description must be 160 characters or fewer.";
    if (!/^\d{4,6}$/.test(pin)) return "Enter your 4–6 digit transaction PIN.";
    return "";
  }

  function review(e: FormEvent) {
    e.preventDefault(); const message = validate(); setError(message); if (!message) setStep("review");
  }

  async function submit() {
    if (!recipient) return;
    setSubmitting(true); setError("");
    try {
      const r = await api.post("/transfer", { recipientAccountNumber: recipient.accountNumber, amount: numericAmount, type: "internal", description: description || purpose, pin }, { headers: { "Idempotency-Key": key() } });
      setResult(r.data); setStep("success");
      if (user) auth.setUser({ ...user, balance: Math.max(0, user.balance - Number(r.data.total ?? total)) });
    } catch (e: any) { setError(e?.response?.data?.message || e?.message || "Transfer failed. No successful server confirmation was received."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50 text-sm text-slate-500">Loading your secure transfer workspace…</main>;
  if (!user) return null;

  if (step === "success" && result) return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><ArrowLeft size={16}/> Dashboard</Link><section className="mt-6 rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200 md:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={32}/></span><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Transfer Successful</p><h1 className="mt-2 text-4xl font-bold text-slate-900">${Number(result.amount ?? numericAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</h1><p className="mt-2 text-slate-500">Sent to {recipient?.name}</p><dl className="mt-8 divide-y rounded-2xl bg-slate-50 px-5 text-left"><Detail label="Recipient" value={`${recipient?.name} · ${mask(recipient?.accountNumber || "")}`}/><Detail label="Fee" value={`$${Number(result.fee ?? fee).toFixed(2)}`}/><Detail label="Total debited" value={`$${Number(result.total ?? total).toFixed(2)}`}/><Detail label="Status" value="Completed · Instant"/><Detail label="Reference" value={result.reference || "—"} mono/></dl><div className="mt-7 grid gap-3 sm:grid-cols-3"><Link href="/transactions" className="rounded-xl bg-sky-700 px-4 py-3 text-sm font-bold text-white">View Transaction</Link><button onClick={() => window.print()} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Download Receipt</button><button onClick={() => { setStep("details"); setAmount(""); setPin(""); setDescription(""); setRecipient(null); setAccountNumber(""); setResult(null); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Make Another</button></div></section></div></main>;

  if (step === "review") return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-2xl"><button onClick={() => setStep("details")} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><ArrowLeft size={16}/> Edit transfer</button><section className="mt-6 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 md:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-sky-700">Step 2 of 2</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Review transfer</h1><div className="mt-7 space-y-3"><Detail label="From" value={`${user.name} · ${mask(user.accountNumber)}`}/><Detail label="To" value={`${recipient?.name} · ${mask(recipient?.accountNumber || "")}`}/><Detail label="Amount" value={`$${numericAmount.toFixed(2)} USD`}/><Detail label="Fee" value={`$${fee.toFixed(2)}`}/><Detail label="Total" value={`$${total.toFixed(2)}`} strong/><Detail label="Delivery" value="Instant"/><Detail label="Purpose" value={purpose}/></div>{error && <Error message={error}/>}<label className="mt-6 block text-sm font-semibold text-slate-700">Transaction PIN<input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" placeholder="4–6 digits"/></label><button onClick={submit} disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? <><Loader2 size={18} className="animate-spin"/> Processing securely…</> : <>Confirm and send <ArrowRight size={18}/></>}</button><p className="mt-3 text-center text-xs text-slate-400">The backend rechecks authorization, balance, limits, fees and PIN and uses an idempotency key.</p></section></div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-7 md:px-8"><div className="mx-auto max-w-5xl"><div className="flex items-start justify-between gap-5"><div><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><ArrowLeft size={16}/> Dashboard</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-sky-700">Secure banking</p><h1 className="mt-1 text-3xl font-bold text-slate-900 md:text-4xl">Transfer Money</h1><p className="mt-2 text-slate-500">Send money securely to another Crestline Capital customer or prepare an external transfer.</p></div><div className="hidden rounded-2xl bg-white p-4 text-right shadow-sm ring-1 ring-slate-200 sm:block"><span className="text-xs text-slate-400">Available balance</span><b className="mt-1 block text-lg text-slate-900">${Number(user.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}</b></div></div><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]"><section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-8"><div className="flex items-center justify-between"><div><span className="text-xs font-bold uppercase tracking-widest text-slate-400">Step 1 of 2</span><h2 className="mt-1 text-lg font-bold">Transfer details</h2></div><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={16}/> Secure session</span></div><div className="mt-6 grid gap-3 md:grid-cols-3">{(Object.keys(typeCopy) as TransferType[]).map(t => <button type="button" key={t} onClick={() => { setType(t); setError(""); }} className={`rounded-2xl border p-4 text-left ${type === t ? "border-sky-600 bg-sky-50 ring-2 ring-sky-100" : "border-slate-200 hover:border-slate-300"}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100">{t === "internal" ? <UserRound size={18}/> : t === "external" ? <Building2 size={18}/> : <Globe2 size={18}/>}</span><b className="mt-3 block text-sm">{typeCopy[t].title}</b><small className="mt-1 block text-xs text-slate-500">{typeCopy[t].subtitle}</small></button>)}</div>{type !== "internal" && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Not enabled for live submission</b><p className="mt-1">The repository has a Paystack payout service for approved withdrawals, but no external-bank transfer API for this screen. This option will not fake verification or move money until that provider integration is implemented.</p></div>}<form onSubmit={review} className="mt-7 space-y-5"><div className="grid gap-4 md:grid-cols-[1fr_auto]"><Field label={type === "internal" ? "Crestline account number" : type === "international" ? "IBAN / destination account" : "Destination account"} value={accountNumber} onChange={setAccountNumber} placeholder={type === "internal" ? "10–20 digit account number" : "Destination account"}/><button type="button" disabled={checking || type !== "internal"} onClick={verifyRecipient} className="self-end rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-40">{checking ? "Checking…" : "Verify"}</button></div>{recipient && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Verified recipient</p><p className="mt-1 font-bold text-emerald-950">{recipient.name}</p><p className="text-sm text-emerald-800">{mask(recipient.accountNumber)} · Crestline Capital</p></div>}<div className="grid gap-4 md:grid-cols-2"><Field label="Amount" value={amount} onChange={v => setAmount(v.replace(/[^0-9.]/g, ""))} placeholder="0.00" inputMode="decimal"/><div><label className="text-sm font-semibold text-slate-700">Currency<select disabled className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option>USD</option></select></label></div></div>{type !== "internal" && <div className="grid gap-4 md:grid-cols-2"><Field label="Bank" value={bank} onChange={setBank} placeholder="Bank name"/><Field label="Country" value={country} onChange={setCountry} placeholder="Country code"/><Field label="Routing / sort code" value={routing} onChange={setRouting} placeholder="Routing number"/><Field label="SWIFT / BIC" value={swift} onChange={setSwift} placeholder="SWIFT / BIC"/><Field label="IBAN" value={iban} onChange={setIban} placeholder="IBAN"/></div>}<div className="grid gap-4 md:grid-cols-2"><Field label="Description" value={description} onChange={setDescription} placeholder="Payment reference"/><div><label className="text-sm font-semibold text-slate-700">Transfer purpose<select value={purpose} onChange={e => setPurpose(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"><option>Personal</option><option>Family</option><option>Business</option><option>Education</option><option>Other</option></select></label></div></div>{error && <Error message={error}/>}<div className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between text-sm"><span className="text-slate-500">Available balance</span><b>${Number(user.balance).toFixed(2)}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Transfer fee</span><b>${fee.toFixed(2)}</b></div><div className="mt-2 flex justify-between border-t border-slate-200 pt-2"><span className="font-bold">Total</span><b>${total.toFixed(2)}</b></div><p className="mt-2 text-xs text-slate-400">Internal delivery: instant. Server limits are authoritative.</p></div><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3.5 text-sm font-bold text-white">Continue to review <ArrowRight size={18}/></button></form></section><aside className="space-y-4"><div className="rounded-3xl bg-slate-900 p-6 text-white"><ShieldCheck size={24}/><h3 className="mt-4 font-bold">Bank-grade controls</h3><p className="mt-2 text-sm leading-6 text-slate-300">Authorization, balance, limits, fee calculation and PIN verification are performed server-side.</p></div><div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h3 className="font-bold">Current transfer limit</h3><p className="mt-2 text-sm text-slate-500">The existing backend enforces a $100,000 daily successful-transfer amount limit.</p></div></aside></div></div></main>;
}

function Field({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: "decimal" | "numeric" }) { return <label className="block text-sm font-semibold text-slate-700">{label}<input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"/></label>; }
function Detail({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) { return <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-slate-500">{label}</dt><dd className={`${strong ? "text-lg" : "text-sm"} ${mono ? "font-mono" : "font-semibold"} text-right text-slate-800`}>{value}</dd></div>; }
function Error({ message }: { message: string }) { return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div>; }
