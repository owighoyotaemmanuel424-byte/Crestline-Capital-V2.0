"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

const navItems = [
  ["⌂", "Home", "/dashboard"],
  ["▥", "Stats", "/transactions"],
  ["▣", "Cards", "/cards"],
  ["♙", "Profile", "/account"],
];

export default function Dashboard() {
  const router = useRouter();
  const auth = useAuth();
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [u, t] = await Promise.all([api.get("/user"), api.get("/transactions")]);
        auth.setUser(u.data.user);
        setTx(t.data.transactions || []);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth, router]);

  const user = auth.user;
  const firstName = user?.name?.split(" ")[0] || "Customer";
  const balance = user?.balance || 0;
  const accountLast4 = user?.accountNumber?.slice(-4) || "0000";
  const maskedCard = "•••• •••• •••• 4821";

  const displayTransactions = useMemo(() => tx.slice(0, 5), [tx]);

  if (loading) return <main className="premium-loading"><div className="loading-mark">C</div><p>Loading your secure banking experience…</p></main>;
  if (!user) return null;

  const signOut = () => {
    auth.clear();
    router.push("/login");
  };

  return (
    <main className="premium-bank-app">
      <aside className="premium-sidebar">
        <a className="premium-logo" href="/"><span>C</span><strong>Crestline<em>Capital</em></strong></a>
        <div className="premium-user"><div className="premium-avatar">{firstName.slice(0, 1).toUpperCase()}</div><div><b>{user.name}</b><small>Personal account</small></div></div>
        <nav>{navItems.map(([icon, label, href]) => <a className={label === "Home" ? "active" : ""} href={href} key={label}><i>{icon}</i>{label}</a>)}<a href="/transfer"><i>↗</i>Send money</a>{user.isAdmin && <a href="/admin"><i>⚙</i>Admin</a>}</nav>
        <div className="sidebar-protected"><span>✓</span><div><b>Account protected</b><small>Secure session active</small></div></div>
        <button className="premium-signout" onClick={signOut}>↪ Sign out</button>
      </aside>

      <div className="premium-main">
        <header className="premium-header">
          <button className="mobile-menu" aria-label="Open menu">☰</button>
          <div><small>PERSONAL BANKING</small><h1>Good Morning, {firstName}</h1></div>
          <div className="header-tools"><button aria-label="Notifications">♧<span /></button><div className="premium-header-avatar">{firstName.slice(0, 1).toUpperCase()}</div></div>
        </header>

        <section className="premium-balance-card">
          <div className="balance-card-top"><div className="greeting-avatar">{firstName.slice(0, 1).toUpperCase()}</div><div className="balance-greeting"><span>Good Morning</span><b>{user.name}</b></div><div className="balance-time">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<small>{new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</small></div></div>
          <div className="available-row"><div><span>Available Balance</span><strong>{showBalance ? `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD` : "••••••••"}</strong></div><button onClick={() => setShowBalance(!showBalance)} aria-label="Toggle balance">{showBalance ? "⌁" : "◉"}</button></div>
          <div className="balance-account-row"><div className="shield-icon">♢</div><div><small>Your Account Number</small><b>{showBalance ? `${user.accountNumber.slice(0, 7)}...` : "•••••••"}</b></div><span className="active-badge">● Active</span><a href="/transactions">↗ Transactions</a><a href="/transfer">▣ Top up</a></div>
        </section>

        <section className="today-panel">
          <div className="today-heading"><h2>What would you like to do today?</h2><p>Choose from our popular actions below</p></div>
          <div className="today-actions">
            <a href="/account"><span className="action-icon">▥</span><b>Account Info</b></a>
            <a className="send-action" href="/transfer"><span className="action-icon">↗</span><b>Send Money</b></a>
            <a className="deposit-action" href="/transfer"><span className="action-icon">＋</span><b>Top Up</b></a>
            <a className="history-action" href="/transactions"><span className="action-icon">◴</span><b>Transaction History</b></a>
          </div>
        </section>

        <section className="premium-content-grid">
          <article className="premium-card-preview">
            <div className="card-preview-head"><div><small>VIRTUAL BANKING</small><b>Premium Card</b></div><strong>VISA</strong></div>
            <div className="chip" />
            <div className="card-number">{showCard ? "4821 9027 3547 4821" : maskedCard}</div>
            <div className="card-preview-bottom"><div><small>CARD HOLDER</small><b>{user.name}</b></div><div><small>VALID THRU</small><b>12/30</b></div></div>
            <div className="card-buttons"><button onClick={() => setShowCard(!showCard)}>↻ {showCard ? "Hide Details" : "Show Details"}</button><a href="/cards">Manage Card</a></div>
          </article>

          <article className="premium-transactions">
            <div className="premium-section-title"><div><small>ACCOUNT ACTIVITY</small><h2>Recent Transactions</h2></div><a href="/transactions">View all</a></div>
            {displayTransactions.length === 0 ? <div className="premium-empty"><span>◷</span><b>No transactions yet</b><p>Your first transfer will appear here.</p></div> : <div className="premium-tx-list">{displayTransactions.map((t) => <div className="premium-tx" key={t.id || t.reference}><span className={t.direction === "credit" ? "tx-circle credit" : "tx-circle"}>{t.direction === "credit" ? "↓" : "↑"}</span><div><b>{t.counterparty || "Account transfer"}</b><small>{t.description || t.type} · {new Date(t.createdAt).toLocaleDateString()}</small></div><strong className={t.direction === "credit" ? "credit-text" : "debit-text"}>{t.direction === "credit" ? "+" : "-"}${Number(t.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>)}</div>}
          </article>
        </section>

        <section className="premium-security"><span>✓</span><div><b>Your account is protected</b><p>Secure authentication and transaction verification are active.</p></div><a href="/account">Security settings →</a></section>
      </div>

      <nav className="mobile-bottom-nav">{navItems.map(([icon, label, href]) => <a className={label === "Home" ? "active" : ""} href={href} key={label}><i>{icon}</i><span>{label}</span></a>)}<a className="bottom-center" href="/transfer"><i>▦</i></a></nav>
    </main>
  );
}
