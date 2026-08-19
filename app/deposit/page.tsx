"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, CreditCard, Headphones, Send } from "lucide-react";

const methods = [
  { label: "Bank Transfer", icon: Building2 },
  { label: "Credit / Debit Card", icon: CreditCard },
  { label: "Wire Transfer", icon: Send },
];

export default function DepositPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[.18em] text-sky-600">FUND YOUR ACCOUNT</p>
              <h1 className="mt-1 text-3xl font-bold">Deposits are temporarily unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Crestline Capital will not display a deposit as successful until a real payment-provider transaction has been initialized and confirmed by a verified webhook.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {methods.map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-70">
                <Icon size={22} className="text-slate-500" />
                <b className="mt-3 block text-sm">{label}</b>
                <span className="mt-1 block text-xs text-slate-500">Provider integration pending</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No balance, transaction, or receipt is created from this page while funding integration is unavailable.
          </div>

          <Link href="/support" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white">
            <Headphones size={17} /> Contact support
          </Link>
        </section>
      </div>
    </main>
  );
}
