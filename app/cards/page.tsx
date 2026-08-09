"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  CreditCard,
  Globe,
  Grid,
  Headphones,
  Home,
  Hourglass,
  Moon,
  PlusCircle,
  Send,
  Settings,
  Shield,
  Sliders,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { applyForCard, getMyCards } from "./actions";

type CardItem = {
  id: string;
  last4: string;
  brand: string;
  type: string;
  status: string;
  spendingLimit: number;
  issuedAt?: string;
  createdAt?: string;
};

type CardsData = { balance: number; cards: CardItem[] };

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  frozen: "bg-sky-50 text-sky-700",
  revoked: "bg-rose-50 text-rose-700",
};

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Transfer", href: "/transfer", icon: Send },
  { label: "Deposit", href: "/dashboard", icon: PlusCircle },
  { label: "Activity", href: "/transactions", icon: TrendingUp },
  { label: "Cards", href: "/cards", icon: CreditCard },
  { label: "Settings", href: "/account", icon: Settings },
  { label: "Support", href: "/support", icon: Headphones },
  { label: "More", href: "/dashboard", icon: Grid },
];

function MetricCard({ icon: Icon, iconClass, label, value }: { icon: typeof CreditCard; iconClass: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={23} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Cards() {
  const [data, setData] = useState<CardsData>({ balance: 0, cards: [] });
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  async function load() {
    const token = typeof window !== "undefined" ? localStorage.getItem("crestline_token") : null;
    if (!token) {
      setError("Please sign in again.");
      setLoading(false);
      return;
    }
    try {
      const result = await getMyCards(token);
      setData(result);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Unable to load your cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function apply(type: "virtual" | "physical") {
    const token = localStorage.getItem("crestline_token");
    if (!token) { setError("Please sign in again."); return; }
    setApplying(true);
    setError("");
    setMessage("");
    try {
      const result = await applyForCard(token, type, "visa");
      setMessage(result.message);
      await load();
    } catch (e: any) {
      setError(e?.message || "Unable to submit application.");
    } finally {
      setApplying(false);
    }
  }

  const activeCards = useMemo(() => data.cards.filter((card) => card.status === "active").length, [data.cards]);
  const pendingApplications = useMemo(() => data.cards.filter((card) => card.status === "pending").length, [data.cards]);

  return (
    <div className={dark ? "min-h-screen bg-slate-950 pb-28 text-white" : "min-h-screen bg-slate-50 pb-28 text-slate-900"}>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pb-5 pt-6 sm:px-8">
        <a href="/dashboard" className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-sky-500 text-white shadow-sm">
            <span className="absolute bottom-2 h-0 w-0 border-l-[11px] border-r-[11px] border-b-[15px] border-l-transparent border-r-transparent border-b-white opacity-95" />
            <span className="absolute bottom-[8px] h-0.5 w-6 rounded bg-white" />
          </span>
          <span className="text-base font-bold tracking-tight sm:text-lg">Crestline Capital</span>
        </a>
        <div className="flex items-center gap-2">
          <button aria-label="Toggle dark mode" onClick={() => setDark((value) => !value)} className={`flex h-10 w-10 items-center justify-center rounded-full border ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}><Moon size={18} /></button>
          <button aria-label="Notifications" className={`relative flex h-10 w-10 items-center justify-center rounded-full border ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sky-500" /></button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        {message && <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
        {error && <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard icon={CreditCard} iconClass="bg-sky-500 text-white" label="ACTIVE CARDS" value={loading ? "—" : String(activeCards)} />
          <MetricCard icon={Hourglass} iconClass="bg-amber-500 text-white" label="PENDING APPLICATIONS" value={loading ? "—" : String(pendingApplications)} />
          <MetricCard icon={Wallet} iconClass="bg-emerald-500 text-white" label="TOTAL BALANCE" value={loading ? "—" : `$${data.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        </section>

        <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 p-6 shadow-lg sm:p-8">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-blue-900/20 blur-3xl" />
          <div className="relative">
            <div className="flex justify-end">
              <button className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"><span>🇺🇸</span> EN <ChevronDown size={14} /></button>
            </div>
            <div className="mt-6 max-w-2xl">
              <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Virtual Cards Made Easy</p>
              <p className="mt-2 text-sm leading-6 text-white/90 sm:text-base">Create virtual cards for secure online payments, subscription management, and more. Enhanced security and spending control.</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                [Shield, "Secure", "Protected payments"],
                [Globe, "Global", "Worldwide acceptance"],
                [Sliders, "Control", "Spending limits"],
                [Zap, "Instant", "Quick issuance"],
              ].map(([Icon, title, text]) => {
                const FeatureIcon = Icon as typeof Shield;
                return <div key={String(title)} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"><FeatureIcon size={19} className="text-white" /><p className="mt-3 text-sm font-bold text-white">{String(title)}</p><p className="mt-0.5 text-xs text-white/75">{String(text)}</p></div>;
              })}
            </div>
            <button disabled={applying || data.cards.some((card) => ["pending", "active", "frozen"].includes(card.status))} onClick={() => apply("virtual")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><PlusCircle size={18} /> {applying ? "Submitting…" : "Apply Now"}</button>
          </div>
        </section>

        {!loading && data.cards.length > 0 && <section className="mt-6 space-y-3"><div className="flex items-center justify-between"><h2 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>Your cards</h2><button onClick={() => void load()} className="text-xs font-semibold text-sky-600">Refresh</button></div>{data.cards.map((card) => <article key={card.id} className={`rounded-2xl border p-4 ${dark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white shadow-sm"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold capitalize">{card.type} card · {String(card.brand).toUpperCase()}</p><p className="mt-1 font-mono text-sm text-slate-500">•••• •••• •••• {card.last4}</p></div><div className="text-left sm:text-right"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle[card.status] || "bg-slate-100 text-slate-600"}`}>{card.status}</span><p className="mt-2 text-xs text-slate-500">Limit ${card.spendingLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p></div></div>{card.status === "pending" && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">Application pending administrator approval.</p>}</article>)}</section>}
      </main>

      <nav className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-5xl rounded-full border p-2 shadow-xl ${dark ? "border-slate-700 bg-slate-900" : "border-slate-100 bg-white"}`} aria-label="Primary navigation">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = label === "Cards";
            return <a key={label} href={href} className={`flex min-w-[58px] shrink-0 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[10px] font-semibold transition sm:min-w-0 sm:flex-1 sm:flex-row sm:gap-1.5 sm:text-xs ${active ? "bg-sky-500 text-white shadow-sm" : dark ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><Icon size={17} /><span>{label}</span></a>;
          })}
        </div>
      </nav>
    </div>
  );
}
