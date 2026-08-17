"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, UserRound, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

type TransferType = "internal" | "external" | "international";
const typeCopy: Record<TransferType, { title: string; subtitle: string }> = {
  internal: { title: "Internal Transfer", subtitle: "Crestline Capital → Crestline Capital" },
  external: { title: "Bank Transfer", subtitle: "Crestline Capital → external bank" },
  international: { title: "International Transfer", subtitle: "Crestline Capital → international bank" },
};
function mask(value: string) { return value ? `•••• •••• ${value.replace(/\s/g, "").slice(-4)}` : "••••"; }
function key() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export default function TransferPage() {
  const session = authClient.useSession();
  const ensureProfile = useMutation(api.users.ensureProfile);
  const createTransfer = useMutation(api.transfers.create);
  const [type, setType] = useState<TransferType>("internal");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("Personal");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"details" | "review" | "success">("details");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [profileReady, setProfileReady] = useState(false);
  const user = useQuery(api.users.me, session.data ? {} : "skip");
  const recipient = useQuery(api.transfers.verifyRecipient, accountNumber.length >= 10 ? { accountNumber } : "skip");

  useEffect(() => {
    if (!session.data?.user || profileReady) return;
    ensureProfile({ name: session.data.user.name || undefined, email: session.data.user.email || undefined })
      .then(() => setProfileReady(true)).catch((e) => setError(e?.message || "Unable to initialize your banking profile."));
  }, [session.data?.user, profileReady, ensureProfile]);

  const numericAmount = Number(amount);
  const fee = useMemo(() => type === "internal" ? 0 : Math.min(25, Math.max(2.5, numericAmount > 0 ? numericAmount * 0.005 : 0)), [type, numericAmount]);
  const total = (Number.isFinite(numericAmount) ? numericAmount : 0) + fee;

  function validate() {
    if (!session.data) return "Your session has expired. Please sign in again.";
    if (!profileReady || !user) return "Your banking profile is still loading. Please try again.";
    if (type !== "internal") return "External and international transfers are not enabled until a real bank-provider integration is configured.";
    if (!recipient) return "Verify a valid Crestline recipient before continuing.";
    if (recipient.accountNumber === user.accountNumber) return "You cannot transfer money to your own account.";
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "Enter an amount greater than zero.";
    if (numericAmount > 100000) return "This exceeds the current daily transfer limit.";
    if (total > user.balance) return "Insufficient available balance.";
    if (description.length > 160) return "Description must be 160 characters or fewer.";
    if (!/^\d{4,6}$/.test(pin)) return "Enter your 4–6 digit transaction PIN.";
    return "";
  }

  function review(e: FormEvent) { e.preventDefault(); const message = validate(); setError(message); if (!message) setStep("review"); }

  async function submit() {
    if (!recipient) return;
    setError("");
    try {
      const response = await createTransfer({ recipientAccountNumber: recipient.accountNumber, amount: numericAmount, type: "internal", description: description || purpose, pin, idempotencyKey: key() });
      setResult(response); setStep("success");
    } catch (e: any) { setError(e?.message || "Transfer could not be completed."); }
  }

  if (session.isPending || user === undefined) return <main className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></main>;
  if (!session.data) { if (typeof window !== "undefined") window.location.href = "/login"; return null; }
  if (step === "success") return <main className="min-h-screen p-6"><div className="mx-auto max-w-xl rounded-2xl border p-8 text-center"><Check className="mx-auto mb-4" /><h1 className="text-2xl font-semibold">Transfer Successful</h1><p className="mt-2">Your transfer has been submitted successfully.</p><div className="mt-6 space-y-2 text-sm"><p>Amount: {result.amount} {result.currency}</p><p>Fee: {result.fee} {result.currency}</p><p>Reference: {result.reference}</p><p>Transaction ID: {result.transactionId}</p></div><Link className="mt-6 inline-flex" href="/dashboard">Back to Dashboard</Link></div></main>;

  return <main className="min-h-screen p-4 sm:p-6"><div className="mx-auto max-w-3xl"><Link href="/dashboard" className="inline-flex items-center gap-2"><ArrowLeft size={16} /> Back</Link><div className="mt-6 rounded-2xl border p-6"><div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Transfer Money</h1><p className="mt-1 text-sm opacity-70">Send money securely from your Crestline Capital account.</p></div><ShieldCheck /></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{(["internal", "external", "international"] as TransferType[]).map((value) => <button key={value} type="button" onClick={() => { setType(value); setError(""); }} className={`rounded-xl border p-4 text-left ${type === value ? "ring-2" : ""}`}><div className="font-medium">{typeCopy[value].title}</div><div className="mt-1 text-xs opacity-60">{typeCopy[value].subtitle}</div></button>)}</div>
    <form onSubmit={review} className="mt-6 space-y-5"><div className="rounded-xl border p-4"><div className="text-sm opacity-60">Available balance</div><div className="mt-1 text-xl font-semibold">{user.balance.toFixed(2)} {user.currency}</div></div>
      <div><label className="text-sm font-medium">Recipient account number</label><div className="mt-2 flex gap-2"><input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 rounded-xl border p-3" inputMode="numeric" autoComplete="off"/><span className="self-center text-sm opacity-60">{accountNumber.length >= 10 ? recipient ? "Verified" : "Not found" : "10–20 digits"}</span></div>{recipient && <div className="mt-3 flex items-center gap-3 rounded-xl border p-3"><UserRound size={18}/><div><div className="font-medium">{recipient.name}</div><div className="text-xs opacity-60">{mask(recipient.accountNumber)}</div></div></div>}</div>
      {type !== "internal" && <div className="rounded-xl border p-4 text-sm">External and international transfers are blocked until a real provider integration is configured. No money will move.</div>}
      <div><label className="text-sm font-medium">Amount</label><input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2 w-full rounded-xl border p-4 text-2xl" inputMode="decimal" placeholder="0.00"/></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="text-sm font-medium">Purpose</label><select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="mt-2 w-full rounded-xl border p-3"><option>Personal</option><option>Family</option><option>Services</option><option>Other</option></select></div><div><label className="text-sm font-medium">Transaction PIN</label><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 w-full rounded-xl border p-3" inputMode="numeric" type="password" autoComplete="off"/></div></div>
      <div><label className="text-sm font-medium">Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full rounded-xl border p-3" maxLength={160}/></div>
      {error && <div role="alert" className="rounded-xl border p-3 text-sm">{error}</div>}
      <div className="flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-medium">Review Transfer <ArrowRight size={16}/></button></div>
    </form>
    {step === "review" && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-background p-6"><h2 className="text-xl font-semibold">Review Transfer</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>From</span><span>{mask(user.accountNumber)}</span></div><div className="flex justify-between"><span>To</span><span>{recipient?.name} · {mask(recipient?.accountNumber ?? "")}</span></div><div className="flex justify-between"><span>Amount</span><span>{numericAmount.toFixed(2)} {user.currency}</span></div><div className="flex justify-between"><span>Fee</span><span>{fee.toFixed(2)} {user.currency}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>{total.toFixed(2)} {user.currency}</span></div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setStep("details")} className="rounded-xl border px-4 py-2">Edit</button><button type="button" onClick={submit} className="rounded-xl border px-4 py-2">Confirm Transfer</button></div></div></div>}
  </div></div></main>;
}
