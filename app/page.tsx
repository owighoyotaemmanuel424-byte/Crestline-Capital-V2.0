"use client"

import { useMemo, useState } from "react"

type Activity = {
  title: string
  meta: string
  amount: string
  tone: "positive" | "neutral"
}

const initialActivity: Activity[] = [
  { title: "Salary deposit", meta: "Today · Direct deposit", amount: "+$8,400.00", tone: "positive" },
  { title: "Transfer to savings", meta: "Yesterday · Internal transfer", amount: "−$1,200.00", tone: "neutral" },
  { title: "Aster & Co.", meta: "Nov 04 · Card purchase", amount: "−$184.20", tone: "neutral" },
  { title: "Dividend payout", meta: "Nov 01 · Portfolio income", amount: "+$624.80", tone: "positive" },
]

function Icon({ name }: { name: "grid" | "wallet" | "arrow" | "chart" | "users" | "settings" | "bell" | "plus" | "download" | "chevron" }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H20v14H6.5A2.5 2.5 0 0 1 4 16.5zM4 8h16M16 12h4",
    arrow: "M5 12h14M13 6l6 6-6 6M5 6v12",
    chart: "M4 19V5M4 19h16M8 15l3-4 3 2 4-6",
    users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 4.5a3.5 3.5 0 0 1 0 6.8M17 15a3.5 3.5 0 0 1 3 3.5V20",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6.4v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1H15v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.5 1z",
    bell: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus: "M12 5v14M5 12h14",
    download: "M12 4v11M8 11l4 4 4-4M5 20h14",
    chevron: "M7 10l5 5 5-5",
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export default function Home() {
  const [active, setActive] = useState("Overview")
  const [activity, setActivity] = useState(initialActivity)
  const [modal, setModal] = useState<"transfer" | "withdraw" | null>(null)
  const [amount, setAmount] = useState("")
  const [notice, setNotice] = useState("")

  const balance = useMemo(() => {
    const starting = 24860.42
    const changes = activity.reduce((sum, item) => sum + (item.tone === "positive" ? Number(item.amount.replace(/[^0-9.-]/g, "")) : -Number(item.amount.replace(/[^0-9.-]/g, ""))), 0)
    return starting + changes - 7764.8
  }, [activity])

  function submitMoneyMovement(event: React.FormEvent) {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) return
    const title = modal === "transfer" ? "Transfer to recipient" : "Withdrawal request"
    setActivity([{ title, meta: "Just now · Demo transaction", amount: `−$${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, tone: "neutral" }, ...activity])
    setNotice(`${title} submitted in demo mode.`)
    setAmount("")
    setModal(null)
  }

  const nav = [
    ["Overview", "grid"], ["Accounts", "wallet"], ["Transfers", "arrow"], ["Investments", "chart"], ["Team", "users"],
  ] as const

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><span>Crestline<span className="brand-light">Capital</span></span></div>
        <div className="workspace-label">PERSONAL WEALTH</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map(([label, icon]) => <button key={label} className={`nav-item ${active === label ? "active" : ""}`} onClick={() => setActive(label)}><Icon name={icon} /><span>{label}</span>{label === "Overview" && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="secure-card"><div className="secure-orb" /><p>Protected by Crestline</p><span>Bank-grade security</span></div>
        <button className="nav-item"><Icon name="settings" /><span>Settings</span></button>
        <div className="profile-row"><div className="avatar">JD</div><div><strong>Jordan Davis</strong><span>Personal account</span></div><Icon name="chevron" /></div>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{active}</strong></div><div className="top-actions"><span className="live-status"><i /> All systems operational</span><button className="icon-button" aria-label="Notifications"><Icon name="bell" /><span className="notification-dot" /></button><div className="mini-avatar">JD</div></div></header>
        <div className="page-wrap">
          <div className="welcome-row"><div><p className="eyebrow">THURSDAY, NOVEMBER 6, 2026</p><h1>Good morning, Jordan.</h1><p className="muted">Here is your financial overview for today.</p></div><button className="outline-button" onClick={() => setNotice("Export prepared in demo mode.")}><Icon name="download" /> Export report</button></div>
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}
          <div className="stats-grid"><article className="balance-card"><div className="card-top"><span>Total balance</span><span className="balance-change">+12.8% <small>this month</small></span></div><div className="balance-value">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div><div className="sparkline"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="card-footer"><span>Updated just now</span><button onClick={() => setActive("Accounts")}>View accounts <b>→</b></button></div></article><article className="stat-card"><div className="stat-icon sage"><Icon name="chart" /></div><span className="stat-label">Invested assets</span><strong>$42,680.00</strong><span className="positive-text">+$2,164.30 <small>+5.3%</small></span><div className="stat-bar"><i /></div></article><article className="stat-card"><div className="stat-icon gold"><Icon name="wallet" /></div><span className="stat-label">Available to spend</span><strong>$8,240.62</strong><span className="muted">Across 2 accounts</span><div className="account-chips"><i /> Checking <i className="dark-dot" /> Savings</div></article></div>

          <div className="section-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Transactions across your accounts</p></div><button className="text-button" onClick={() => setActive("Accounts")}>View all <b>→</b></button></div><div className="activity-list">{activity.slice(0, 5).map((item, index) => <div className="activity-row" key={`${item.title}-${index}`}><div className={`activity-icon ${item.tone}`}><span>{item.tone === "positive" ? "↑" : "↗"}</span></div><div className="activity-detail"><strong>{item.title}</strong><span>{item.meta}</span></div><strong className={item.tone === "positive" ? "positive-text" : ""}>{item.amount}</strong></div>)}</div></section><section className="panel actions-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Move money with confidence</p></div></div><button className="action-button" onClick={() => setModal("transfer")}><span className="action-icon"><Icon name="arrow" /></span><span><strong>Make a transfer</strong><small>Send money securely</small></span><b>→</b></button><button className="action-button" onClick={() => setModal("withdraw")}><span className="action-icon"><Icon name="download" /></span><span><strong>Request withdrawal</strong><small>Move funds to your bank</small></span><b>→</b></button><div className="trust-note"><span className="shield">✓</span><p><strong>Every transaction is auditable.</strong><br />Your financial records are protected and transparent by design.</p></div></section></div>

          <section className="panel accounts-panel"><div className="panel-heading"><div><h2>Your accounts</h2><p>Manage your Crestline portfolio</p></div><button className="text-button" onClick={() => setNotice("New account flow is available after connecting a backend.")}><Icon name="plus" /> Add account</button></div><div className="account-grid"><div className="account-card primary-account"><div className="account-card-top"><span className="account-symbol">$</span><span>•••• 4820</span></div><span>Everyday Checking</span><strong>$8,240.62</strong><small>Available balance</small></div><div className="account-card"><div className="account-card-top"><span className="account-symbol savings">◇</span><span>•••• 1093</span></div><span>High-yield Savings</span><strong>$16,619.80</strong><small>4.75% APY · $1,200 this month</small></div><div className="account-card investment-card"><div className="account-card-top"><span className="account-symbol invest">↗</span><span>•••• 7751</span></div><span>Investment Portfolio</span><strong>$42,680.00</strong><small>Managed · Moderate growth</small></div></div></section>
          <footer className="footer"><span>© 2026 Crestline Capital</span><span>Member FDIC · Equal Housing Lender</span><span className="demo-label">Demo environment</span></footer>
        </div>
      </section>

      {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><div className="modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setModal(null)}>×</button><p className="eyebrow">DEMO TRANSACTION</p><h2>{modal === "transfer" ? "Make a transfer" : "Request a withdrawal"}</h2><p className="muted">This action is simulated because no backend integration is connected.</p><form onSubmit={submitMoneyMovement}><label htmlFor="amount">Amount</label><div className="amount-input"><span>$</span><input id="amount" type="number" min="1" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required /></div><button className="primary-button" type="submit">{modal === "transfer" ? "Submit transfer" : "Submit request"}</button></form></div></div>}
    </main>
  )
}
