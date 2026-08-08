"use client";

import { useState } from "react";

const transactions = [
  { merchant: "Acme Payroll", category: "Income", date: "Aug 8, 2026", amount: "+$6,420.00", positive: true, icon: "A" },
  { merchant: "Apple Store", category: "Shopping", date: "Aug 8, 2026", amount: "-$129.00", icon: "A" },
  { merchant: "Whole Foods Market", category: "Groceries", date: "Aug 7, 2026", amount: "-$86.42", icon: "W" },
  { merchant: "Netflix", category: "Entertainment", date: "Aug 6, 2026", amount: "-$17.99", icon: "N" },
  { merchant: "Uber", category: "Transport", date: "Aug 5, 2026", amount: "-$24.80", icon: "U" },
];

const navItems = [
  ["⌂", "Overview"], ["↔", "Transfers"], ["▣", "Accounts"], ["▤", "Transactions"],
  ["▰", "Cards"], ["◈", "Savings & Wealth"], ["◎", "Bill Pay"], ["⚙", "Settings"],
];

export default function Dashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [alerts, setAlerts] = useState(true);

  return (
    <div className="customer-dashboard">
      <aside className={mobileOpen ? "dashboard-sidebar open" : "dashboard-sidebar"}>
        <div className="dashboard-brand"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></div>
        <button className="mobile-close" onClick={() => setMobileOpen(false)}>×</button>
        <div className="customer-profile"><div className="avatar">JD</div><div><strong>John Doe</strong><small>Premium Customer</small></div><span>⌄</span></div>
        <nav className="dashboard-nav">
          <small>MAIN MENU</small>
          {navItems.map(([icon, label], index) => <button className={index === 0 ? "active" : ""} key={label} onClick={() => setMobileOpen(false)}><span>{icon}</span>{label}{label === "Transfers" && <em>2</em>}</button>)}
        </nav>
        <div className="sidebar-security"><span>●</span><div><strong>Account protected</strong><small>Last checked just now</small></div></div>
        <button className="logout">↪ <span>Sign out</span></button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button className="menu-button" onClick={() => setMobileOpen(true)}>☰</button>
          <div><span className="dashboard-eyebrow">CUSTOMER PORTAL</span><h1>Good afternoon, John</h1></div>
          <div className="header-actions"><button className="icon-button" onClick={() => setAlerts(!alerts)}>{alerts ? "●" : "○"}<span className="notification-dot" /></button><div className="header-avatar">JD</div></div>
        </header>

        <main className="dashboard-content">
          <section className="balance-hero">
            <div><span className="dashboard-muted">Total available balance</span><button className="eye-button" onClick={() => setHideBalance(!hideBalance)}>{hideBalance ? "Show" : "Hide"}</button><strong>{hideBalance ? "••••••" : "$42,840.64"}</strong><div className="balance-meta"><span>↑ 8.42%</span> compared with last month</div></div>
            <div className="balance-actions"><button className="dashboard-ghost" onClick={() => setShowTransfer(true)}>↗ Send money</button><button className="dashboard-primary" onClick={() => setShowTransfer(true)}>+ Add money</button></div>
          </section>

          <section className="account-cards-grid">
            <article className="customer-card checking-card"><div className="card-heading"><span>CHECKING •••• 2841</span><span className="live-status">● Active</span></div><strong>{hideBalance ? "••••••" : "$28,640.64"}</strong><p>Available balance</p><div className="card-bottom"><span>Direct deposit <b>Early</b></span><span>APY 2.85%</span></div></article>
            <article className="customer-card savings-card"><div className="card-heading"><span>SAVINGS •••• 7712</span><span>2.85% APY</span></div><strong>{hideBalance ? "••••••" : "$14,200.00"}</strong><p>Available balance</p><div className="savings-progress"><span style={{ width: "72%" }} /></div><div className="card-bottom"><span>$4,800 goal remaining</span><b>72%</b></div></article>
            <article className="customer-card wealth-card"><div className="card-heading"><span>INVESTMENT PORTFOLIO</span><span className="gain-text">+12.84%</span></div><strong>{hideBalance ? "••••••" : "$86,442.18"}</strong><p>Portfolio value</p><div className="mini-chart"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="card-bottom"><span>Balanced Growth</span><b>+$9,842.10 YTD</b></div></article>
          </section>

          <section className="dashboard-two-column">
            <article className="dashboard-panel spending-panel"><div className="dashboard-panel-head"><div><span className="dashboard-muted">SPENDING OVERVIEW</span><h2>Cash flow</h2></div><select><option>Last 7 days</option><option>Last 30 days</option><option>This year</option></select></div><div className="spending-summary"><div><small>Income</small><b>$8,240</b><span>↑ 12.4%</span></div><div><small>Spent</small><b>$3,486</b><span>↓ 4.8%</span></div><div><small>Saved</small><b>$4,754</b><span>↑ 18.2%</span></div></div><div className="bar-chart">{[44,61,52,74,48,82,68,91,63,78,57,88].map((height, i) => <i key={i} style={{ height: `${height}%` }}><span /></i>)}</div><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></article>

            <article className="dashboard-panel transactions-panel"><div className="dashboard-panel-head"><div><span className="dashboard-muted">ACTIVITY</span><h2>Recent transactions</h2></div><button className="text-button">View all →</button></div><div className="transaction-list">{transactions.map(tx => <div className="customer-transaction" key={`${tx.merchant}-${tx.date}`}><span className="merchant-icon">{tx.icon}</span><div><strong>{tx.merchant}</strong><small>{tx.category} · {tx.date}</small></div><b className={tx.positive ? "positive" : ""}>{tx.amount}</b></div>)}</div></article>
          </section>

          <section className="dashboard-bottom-grid">
            <article className="dashboard-panel smart-card-dashboard"><div className="dashboard-panel-head"><div><span className="dashboard-muted">YOUR CARD</span><h2>Smart Card</h2></div><span className={frozen ? "card-state frozen" : "card-state"}>{frozen ? "Frozen" : "Active"}</span></div><div className="customer-bank-card"><span>CRESTLINE CAPITAL</span><div className="chip">▦</div><b>•••• 4821</b><small>JOHN DOE <i>VISA SIGNATURE</i></small></div><div className="card-dashboard-controls"><button onClick={() => setFrozen(!frozen)}>{frozen ? "Unfreeze card" : "Freeze card"}</button><button>View details</button><button>View PIN</button></div><div className="card-preferences"><span><i className="green-dot" /> Tap-to-pay enabled</span><button onClick={() => setAlerts(!alerts)}>{alerts ? "Alerts on" : "Alerts off"}</button></div></article>

            <article className="dashboard-panel quick-panel"><span className="dashboard-muted">QUICK ACTIONS</span><h2>What would you like to do?</h2><div className="quick-action-grid"><button onClick={() => setShowTransfer(true)}><span>↗</span><b>Send money</b><small>Transfer funds</small></button><button><span>↓</span><b>Deposit</b><small>Add money</small></button><button><span>◎</span><b>Pay a bill</b><small>Manage bills</small></button><button><span>▣</span><b>Statements</b><small>Download PDF</small></button></div></article>
          </section>

          <section className="security-banner"><div className="security-icon">✓</div><div><strong>Your account is secure</strong><p>Two-factor authentication and fraud monitoring are active on your account.</p></div><button>Security settings →</button></section>
        </main>
      </div>

      {mobileOpen && <button className="dashboard-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      {showTransfer && <div className="dashboard-modal-backdrop" onClick={() => setShowTransfer(false)}><div className="dashboard-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowTransfer(false)}>×</button><span className="dashboard-eyebrow">QUICK TRANSFER</span><h2>Send money</h2><p>Move funds securely from your Crestline checking account.</p><label>Recipient<input placeholder="Name, email, or account number" /></label><label>Amount<input placeholder="$0.00" inputMode="decimal" /></label><button className="dashboard-primary full" onClick={() => setShowTransfer(false)}>Review transfer →</button></div></div>}
    </div>
  );
}
