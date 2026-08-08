"use client";

import { useState } from "react";

const transactions = [
  ["Apple Store", "-$129.00", "Today"],
  ["Acme Payroll", "+$6,420.00", "Yesterday"],
  ["Whole Foods", "-$86.42", "Aug 6"],
  ["Vercel", "-$20.00", "Aug 5"],
];

export default function Home() {
  const [cardFrozen, setCardFrozen] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [earlyDeposit, setEarlyDeposit] = useState(true);

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></a>
        <div className="nav-links">
          <a href="#services">Quick Links</a><a href="#products">Services</a><a href="#wealth">Products</a><a href="#security">Security</a>
        </div>
        <div className="nav-actions"><button className="ghost">Login</button><button className="primary">Register / Get Started Free</button></div>
      </nav>

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <div className="pill"><span className="pulse" /> Next-Gen Financial Ecosystem</div>
          <h1>Wealth Management <span>Without Limits.</span></h1>
          <p>Experience a seamless blend of traditional banking and digital innovation, built around the way modern wealth moves.</p>
          <div className="hero-actions"><button className="primary large">Get Started Free <span>→</span></button><button className="ghost large">How It Works <span>↗</span></button></div>
          <div className="metrics"><div><strong>10,000+</strong><small>Active Users</small></div><div><strong>99.9%</strong><small>Platform Uptime</small></div><div><strong>$500M+</strong><small>Transactions</small></div></div>
        </div>
        <div className="hero-visual">
          <div className="orb orb-one"/><div className="orb orb-two"/>
          <div className="dashboard-card glass">
            <div className="mini-top"><span>Total Portfolio</span><span>•••</span></div>
            <div className="portfolio-value">$248,642.18</div><div className="gain">↗ +12.84% <span>this year</span></div>
            <div className="chart"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
            <div className="allocation"><span>Portfolio allocation</span><b>Balanced Growth</b></div>
          </div>
          <div className="floating-card"><span>CRESTLINE</span><b>••••  4821</b><small>VISA SIGNATURE</small></div>
        </div>
      </section>

      <section id="services" className="section shell">
        <div className="section-head"><div><span className="eyebrow">ONE PLATFORM. EVERY POSSIBILITY.</span><h2>Banking built around <span>your life.</span></h2></div><p>From everyday spending to long-term wealth, everything is connected in one intelligent financial ecosystem.</p></div>
        <div id="products" className="product-grid">
          <article className="product-card glass"><div className="icon">⌁</div><span className="label">PERSONAL BANKING</span><h3>Your money, moving smarter.</h3><p>High-yield checking, early direct deposit and intelligent budgeting tools that adapt to you.</p><div className="toggle-row"><span>Early direct deposit</span><button className={earlyDeposit ? "switch on" : "switch"} onClick={() => setEarlyDeposit(!earlyDeposit)}><i/></button></div></article>
          <article className="product-card glass featured"><div className="icon">◈</div><span className="label">BUSINESS BANKING</span><h3>Power your next chapter.</h3><p>Multi-user access, integrated payroll and flexible line-of-credit controls for growing teams.</p><div className="business-bar"><b>$84,920</b><span>Available credit</span><em>+18.4%</em></div></article>
          <article id="wealth" className="product-card glass"><div className="icon">↗</div><span className="label">SAVINGS & WEALTH</span><h3>Make every dollar work.</h3><p>Automate your savings and preview how your portfolio could grow over time.</p><div className="wealth-preview"><div><small>Projected growth</small><strong>+$61,240</strong></div><b>+24.5%</b></div></article>
        </div>
      </section>

      <section className="section shell app-preview">
        <div className="section-head"><div><span className="eyebrow">LIVE ACCOUNT EXPERIENCE</span><h2>Your financial life, <span>at a glance.</span></h2></div><button className="primary" onClick={() => setShowTransfer(true)}>Quick transfer +</button></div>
        <div className="app-grid">
          <div className="account-panel glass"><div className="panel-top"><span>Available balance</span><span className="secure">● Secure</span></div><strong>$42,840.64</strong><div className="account-id">Checking •••• 2841</div><div className="quick-actions"><button onClick={() => setShowTransfer(true)}>↑<span>Send</span></button><button>↓<span>Deposit</span></button><button>↔<span>Move</span></button><button>⋯<span>More</span></button></div></div>
          <div className="transactions glass"><div className="panel-title"><b>Recent transactions</b><a href="#">View all</a></div>{transactions.map(([name, amount, date]) => <div className="transaction" key={name}><span className="tx-icon">{name[0]}</span><div><b>{name}</b><small>{date}</small></div><strong className={amount.startsWith("+") ? "positive" : ""}>{amount}</strong></div>)}</div>
          <div className="smart-card-panel glass"><div className="panel-title"><b>Smart Card</b><span className="secure">VISA</span></div><div className="bank-card"><span>CRESTLINE CAPITAL</span><b>•••• 4821</b><small>JOHN DOE</small></div><div className="card-controls"><button onClick={() => setCardFrozen(!cardFrozen)}>{cardFrozen ? "Unfreeze card" : "Freeze card"}</button><button>View PIN</button></div><div className="status-line"><span className={cardFrozen ? "status off" : "status"}/> {cardFrozen ? "Card frozen" : "Tap-to-pay active"}<span>Alerts on</span></div></div>
        </div>
      </section>

      <section className="section shell steps"><div className="center-head"><span className="eyebrow">SIMPLE BY DESIGN</span><h2>From application to <span>financial freedom.</span></h2></div><div className="step-grid">{[["01","Apply Online","2 minute application"],["02","Verify Identity","KYC + bank-level security"],["03","Fund Account","Instant ACH / Wire / Debit"],["04","Start Banking","Instant digital card access"]].map(([n,t,d]) => <div className="step glass" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}</div></section>

      <section id="security" className="section shell security"><div className="security-copy"><span className="eyebrow">SECURITY IS THE FOUNDATION</span><h2>Protected by design. <span>Trusted by people.</span></h2><p>Enterprise-grade controls help keep accounts, cards and financial data protected around the clock.</p></div><div className="security-grid">{[["◉","FDIC Insurance","Coverage up to $250k"],["⌁","256-bit Encryption","Bank-grade data security"],["⌁","Two-factor Auth","Extra account protection"],["◌","AI Fraud Monitoring","24/7 transaction monitoring"],["◉","Biometric Login","Fast, secure access"]].map(([i,t,d])=><div className="security-item glass" key={t}><b>{i}</b><div><strong>{t}</strong><small>{d}</small></div></div>)}</div></section>

      <footer className="footer shell"><div className="brand"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></div><p>Modern banking and wealth management for the next generation.</p><span>© 2026 Crestline Capital</span></footer>

      {showTransfer && <div className="modal-backdrop" onClick={() => setShowTransfer(false)}><div className="modal glass" onClick={e => e.stopPropagation()}><button className="close" onClick={() => setShowTransfer(false)}>×</button><span className="eyebrow">QUICK TRANSFER</span><h2>Move money instantly.</h2><label>Recipient<input placeholder="Name or account number"/></label><label>Amount<input placeholder="$0.00"/></label><button className="primary large" onClick={() => setShowTransfer(false)}>Continue →</button></div></div>}
    </main>
  );
}
