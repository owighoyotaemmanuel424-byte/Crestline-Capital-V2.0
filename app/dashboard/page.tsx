"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";

const navItems = [
  ["⌂", "Home", "/dashboard"],
  ["↗", "Send money", "/transfer"],
  ["▥", "Transactions", "/transactions"],
  ["▣", "Cards", "/cards"],
  ["♙", "Account", "/account"],
] as const;

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showCard, setShowCard] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const user = auth.user;
  const firstName = user?.name?.split(" ")[0] || "Customer";
  const balance = user?.balance || 0;
  const displayTransactions = useMemo(() => tx.slice(0, 5), [tx]);
  const signOut = () => {
    auth.clear();
    router.push("/login");
  };

  if (loading) {
    return <main className="premium-loading"><div><div className="loading-mark">C</div><p>Loading your secure banking experience…</p></div></main>;
  }
  if (!user) return null;

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`responsive-sidebar ${collapsed && !mobile ? "collapsed" : ""} ${mobile ? "mobile-drawer" : ""}`}>
      <div className="sidebar-top">
        <Link className="brand" href="/">
          <span>C</span>
          <strong className="brand-text">Crestline <em>Capital</em></strong>
        </Link>
        {mobile ? (
          <button className="close-sidebar" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>×</button>
        ) : (
          <button className="collapse-sidebar" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} onClick={() => setCollapsed((v) => !v)}>{collapsed ? "›" : "‹"}</button>
        )}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{firstName.slice(0, 1).toUpperCase()}</div>
        <div className="sidebar-user-copy"><b>{user.name}</b><small>Personal account</small></div>
      </div>

      <div className="sidebar-label">BANKING</div>
      <nav className="sidebar-nav">
        {navItems.map(([icon, label, href]) => {
          const active = pathname === href;
          return <Link key={href} href={href} className={active ? "active" : ""} title={label}><i>{icon}</i><span>{label}</span></Link>;
        })}
        {user.isAdmin && <Link href="/admin" className={pathname.startsWith("/admin") ? "active" : ""} title="Admin"><i>⚙</i><span>Admin</span></Link>}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-secure" title="Account protected">
        <span>✓</span><div><b>Account protected</b><small>Secure session active</small></div>
      </div>
      <button className="sidebar-signout" onClick={signOut} title="Sign out"><i>↪</i><span>Sign out</span></button>
    </aside>
  );

  return (
    <main className="premium-bank-app">
      <Sidebar />
      {mobileOpen && <><button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /><Sidebar mobile /></>}

      <div className={`premium-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        <header className="premium-header">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>☰</button>
          <div className="header-title"><small>PERSONAL BANKING</small><h1>Good Morning, {firstName}</h1></div>
          <div className="header-tools">
            <button className="notification" aria-label="Notifications">♧<span /></button>
            <div className="premium-header-avatar">{firstName.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <section className="premium-balance-card">
          <div className="balance-card-top">
            <div className="greeting-avatar">{firstName.slice(0, 1).toUpperCase()}</div>
            <div className="balance-greeting"><span>Good Morning</span><b>{user.name}</b></div>
            <div className="balance-time">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<small>{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</small></div>
          </div>
          <div className="available-row">
            <div><span>Available Balance</span><strong>{showBalance ? `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD` : "••••••••"}</strong></div>
            <button aria-label="Toggle balance" onClick={() => setShowBalance((v) => !v)}>{showBalance ? "◉" : "◌"}</button>
          </div>
          <div className="balance-account-row">
            <div className="shield-icon">♢</div>
            <div><small>Your Account Number</small><b>{user.accountNumber ? `${String(user.accountNumber).slice(0, 7)}...` : "••••••••"}</b></div>
            <span className="active-badge">● Active</span>
            <Link href="/transactions">↗ Transactions</Link>
            <Link href="/transfer">▣ Send money</Link>
          </div>
        </section>

        <section className="today-panel">
          <div className="today-heading"><h2>What would you like to do today?</h2><p>Choose from your popular actions below</p></div>
          <div className="today-actions">
            <Link href="/account"><span className="action-icon">▤</span><b>Account Info</b></Link>
            <Link href="/transfer" className="send-action"><span className="action-icon">↗</span><b>Send Money</b></Link>
            <Link href="/transfer" className="deposit-action"><span className="action-icon">＋</span><b>Top Up</b></Link>
            <Link href="/transactions" className="history-action"><span className="action-icon">◴</span><b>History</b></Link>
          </div>
        </section>

        <section className="premium-content-grid">
          <div className="premium-card-preview">
            <div className="card-preview-head"><div><small>VIRTUAL BANKING</small><b>Crestline Premium</b></div><strong>VISA</strong></div>
            <div className="chip" />
            <div className="card-number">{showCard ? "4532 9018 2471 5458" : "•••• •••• •••• 5458"}</div>
            <div className="card-preview-bottom"><div><small>CARD HOLDER</small><b>{user.name}</b></div><div><small>VALID THRU</small><b>04/29</b></div></div>
            <div className="card-buttons"><button onClick={() => setShowCard((v) => !v)}>{showCard ? "Hide details" : "Show details"}</button><Link href="/cards">Manage card</Link></div>
          </div>

          <div className="premium-transactions">
            <div className="premium-section-title"><div><small>RECENT ACTIVITY</small><h2>Transactions</h2></div><Link href="/transactions">View all</Link></div>
            {displayTransactions.length === 0 ? <div className="premium-empty"><span>◷</span><b>No transactions yet</b><p>Your recent banking activity will appear here.</p></div> : displayTransactions.map((t: any, index) => {
              const credit = t.receiverId === user._id || t.type === "credit";
              return <div className="premium-tx" key={t._id || t.reference || index}><span className={`tx-circle ${credit ? "credit" : ""}`}>{credit ? "↓" : "↑"}</span><div><b>{t.description || (credit ? "Money received" : "Transfer")}</b><small>{t.reference || "Transaction"}</small></div><strong className={credit ? "credit-text" : "debit-text"}>{credit ? "+" : "−"}${Number(t.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>;
            })}
          </div>
        </section>

        <section className="premium-security"><span>✓</span><div><b>Your account is protected</b><p>Security monitoring and encrypted banking session are active.</p></div><Link href="/account">Security</Link></section>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}><i>⌂</i><span>Home</span></Link>
        <Link href="/transactions" className={pathname === "/transactions" ? "active" : ""}><i>▥</i><span>Stats</span></Link>
        <Link href="/transfer" className="bottom-center" aria-label="Send money">↗</Link>
        <Link href="/cards" className={pathname === "/cards" ? "active" : ""}><i>▣</i><span>Cards</span></Link>
        <Link href="/account" className={pathname === "/account" ? "active" : ""}><i>♙</i><span>Profile</span></Link>
      </nav>

      <style jsx global>{`
        .premium-bank-app{min-height:100vh;background:#f7f9fb;color:#172a3a;display:flex;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .responsive-sidebar{width:250px;position:fixed;inset:0 auto 0 0;background:#fff;border-right:1px solid #e7edf1;padding:20px 14px;display:flex;flex-direction:column;z-index:70;transition:width .22s ease,transform .22s ease;box-shadow:4px 0 22px rgba(25,52,70,.025)}
        .responsive-sidebar.collapsed{width:82px}.sidebar-top{display:flex;align-items:center;justify-content:space-between;min-height:46px}.brand{display:flex;align-items:center;gap:10px;min-width:0;padding:0 7px;color:#101c27}.brand>span{width:36px;height:36px;flex:none;border-radius:10px;background:#086a9d;color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px}.brand strong{font-size:17px;white-space:nowrap}.brand em{font-style:normal;color:#778691;font-weight:400;margin-left:4px}.collapsed .brand-text,.collapsed .sidebar-user-copy,.collapsed .sidebar-label,.collapsed .sidebar-nav span,.collapsed .sidebar-secure div,.collapsed .sidebar-signout span{display:none}.collapse-sidebar,.close-sidebar{border:0;background:#f2f6f8;color:#647681;width:32px;height:32px;border-radius:9px;font-size:20px;cursor:pointer}.sidebar-user{display:flex;align-items:center;gap:10px;background:#f3f8fb;border:1px solid #e5eef3;border-radius:14px;padding:10px;margin:20px 0 22px}.sidebar-avatar,.premium-header-avatar,.greeting-avatar{display:grid;place-items:center;border-radius:50%;font-weight:800}.sidebar-avatar{width:38px;height:38px;flex:none;background:#e4eef4;color:#12658c}.sidebar-user-copy b,.sidebar-user-copy small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sidebar-user-copy b{font-size:12px;color:#203543}.sidebar-user-copy small{font-size:10px;color:#83919a;margin-top:2px}.sidebar-label{font-size:9px;font-weight:800;letter-spacing:1.8px;color:#98a5ad;padding:0 11px 8px}.sidebar-nav{display:flex;flex-direction:column;gap:4px}.sidebar-nav a,.sidebar-signout{display:flex;align-items:center;gap:12px;width:100%;border:0;border-radius:11px;padding:12px;color:#71808b;background:transparent;text-decoration:none;font-size:12px;text-align:left;transition:.18s}.sidebar-nav a:hover,.sidebar-nav a.active{background:#eaf6fb;color:#086a9d}.sidebar-nav i,.sidebar-signout i{font-style:normal;width:20px;text-align:center;font-size:18px;flex:none}.sidebar-spacer{flex:1}.sidebar-secure{display:flex;align-items:center;gap:9px;border:1px solid #e5edf1;border-radius:12px;padding:11px;margin:10px 0}.sidebar-secure>span{width:29px;height:29px;flex:none;border-radius:50%;background:#e2f7eb;color:#11945a;display:grid;place-items:center}.sidebar-secure b,.sidebar-secure small{display:block}.sidebar-secure b{font-size:9px}.sidebar-secure small{font-size:8px;color:#84939c;margin-top:2px}.sidebar-signout{background:#f5f7f9;color:#62737d;cursor:pointer}.sidebar-signout:hover{background:#edf2f5;color:#1e3d50}.premium-main{margin-left:250px;width:calc(100% - 250px);padding-bottom:50px;background:#f7f9fb;transition:margin-left .22s ease,width .22s ease}.premium-main.sidebar-collapsed{margin-left:82px;width:calc(100% - 82px)}.premium-header{height:82px;background:#fff;border-bottom:1px solid #e8edf1;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(22px,4vw,52px)}.header-title small{font-size:9px;letter-spacing:2px;color:#0b6e9e;font-weight:800}.header-title h1{font-size:20px;margin:5px 0 0}.header-tools{display:flex;align-items:center;gap:13px}.notification{position:relative;border:0;background:#f3f6f8;color:#647580;width:38px;height:38px;border-radius:50%;font-size:18px}.notification span{position:absolute;width:7px;height:7px;background:#e34e56;border-radius:50%;right:7px;top:7px}.premium-header-avatar{width:40px;height:40px;background:#0b6798;color:#fff}.mobile-menu,.sidebar-backdrop,.mobile-drawer{display:none}.premium-main>section{width:min(1120px,calc(100% - 44px));margin-left:auto;margin-right:auto}.premium-balance-card{margin-top:26px!important;background:linear-gradient(135deg,#075f8f,#0b77a9);border-radius:22px;padding:25px 28px;color:#fff;box-shadow:0 18px 35px rgba(0,88,135,.18)}.balance-card-top{display:flex;align-items:center;gap:12px}.greeting-avatar{width:42px;height:42px;background:#f2f7f9;color:#176b91}.balance-greeting span,.balance-greeting b{display:block}.balance-greeting span{font-size:12px;opacity:.75}.balance-greeting b{font-size:14px}.balance-time{margin-left:auto;text-align:right;font-weight:700;font-size:18px}.balance-time small{display:block;font-size:10px;font-weight:400;opacity:.75;margin-top:3px}.available-row{display:flex;align-items:flex-start;justify-content:space-between;margin:31px 0 25px}.available-row span{display:block;font-size:12px;opacity:.78}.available-row strong{display:block;font-size:35px;letter-spacing:-.03em;margin-top:6px}.available-row button{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}.balance-account-row{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.12);border-radius:12px;padding:12px}.shield-icon{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.16);display:grid;place-items:center}.balance-account-row small,.balance-account-row b{display:block}.balance-account-row small{font-size:10px;opacity:.7}.balance-account-row b{font-size:13px}.active-badge{font-size:10px;background:#d9f8e8;color:#07834c;border-radius:20px;padding:5px 9px}.balance-account-row a{background:#fff;color:#12658b;padding:8px 11px;border-radius:8px;font-size:10px;margin-left:auto;text-decoration:none}.balance-account-row a+a{margin-left:0;background:#085f8d;color:#fff}.today-panel{background:#fff;border:1px solid #e6edf1;border-radius:18px;padding:25px;margin-top:18px!important;box-shadow:0 7px 22px rgba(28,54,70,.04)}.today-heading h2{font-size:22px;margin:0}.today-heading p{margin:5px 0 20px;color:#75838d;font-size:13px}.today-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.today-actions a{min-height:130px;border:1px solid #e1e8ed;border-radius:14px;padding:16px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:13px;color:#253745;background:#fff;transition:.2s;text-decoration:none}.today-actions a:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(20,65,90,.08)}.today-actions .action-icon{width:48px;height:48px;border-radius:50%;background:#edf2f5;display:grid;place-items:center;font-size:22px;color:#4d5e6a}.today-actions b{font-size:12px}.today-actions .send-action{background:#086a9d;color:#fff;border-color:#086a9d}.today-actions .send-action .action-icon{background:rgba(255,255,255,.12);color:#fff}.today-actions .deposit-action{background:#eafaf0;border-color:#d2f3df}.today-actions .deposit-action .action-icon{background:#d8f7e4;color:#1ca261}.today-actions .history-action{background:#faf0fc;border-color:#efdaf4}.today-actions .history-action .action-icon{background:#f1def7;color:#8b39a3}.premium-content-grid{display:grid;grid-template-columns:1fr 1.35fr;gap:18px;margin-top:18px!important}.premium-card-preview,.premium-transactions{background:#fff;border:1px solid #e6edf1;border-radius:18px;padding:22px;box-shadow:0 7px 22px rgba(28,54,70,.04)}.card-preview-head{display:flex;justify-content:space-between;color:#213645}.card-preview-head small,.card-preview-head b{display:block}.card-preview-head small{font-size:9px;color:#80909a;letter-spacing:1.5px}.card-preview-head b{font-size:14px;margin-top:4px}.card-preview-head strong{font-size:20px;color:#176caa;font-style:italic}.chip{width:42px;height:29px;border-radius:6px;background:linear-gradient(135deg,#ffd96a,#dca62e);margin:30px 0 14px}.card-number{font-size:18px;letter-spacing:2px;color:#183a51}.card-preview-bottom{display:flex;justify-content:space-between;margin-top:18px}.card-preview-bottom small,.card-preview-bottom b{display:block}.card-preview-bottom small{font-size:8px;color:#82909a}.card-preview-bottom b{font-size:11px;margin-top:3px}.card-buttons{display:flex;gap:8px;margin-top:18px}.card-buttons button,.card-buttons a{flex:1;border:1px solid #d9e2e8;background:#fff;color:#536570;border-radius:9px;padding:9px;text-align:center;font-size:10px;text-decoration:none;cursor:pointer}.card-buttons a{background:#0a6c9f;color:#fff;border-color:#0a6c9f}.premium-section-title{display:flex;justify-content:space-between;align-items:flex-end}.premium-section-title small{font-size:9px;letter-spacing:1.7px;color:#0a6c9f;font-weight:800}.premium-section-title h2{font-size:20px;margin:5px 0}.premium-section-title>a{font-size:10px;color:#0b6b9d;text-decoration:none}.premium-tx{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid #edf1f3}.premium-tx:last-child{border-bottom:0}.premium-tx b,.premium-tx small{display:block}.premium-tx b{font-size:12px}.premium-tx small{font-size:9px;color:#8a969e;margin-top:3px}.tx-circle{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#eef3f6;color:#667984}.tx-circle.credit{background:#e3f8ec;color:#14975b}.premium-tx strong{font-size:11px}.credit-text{color:#15965b}.debit-text{color:#263d4c}.premium-empty{text-align:center;padding:35px 10px;color:#80909a}.premium-empty span{font-size:30px;display:block}.premium-empty b{display:block;color:#334b5b;margin-top:8px}.premium-empty p{font-size:11px}.premium-security{display:flex;align-items:center;gap:12px;background:#eef8fc;border:1px solid #d9edf5;border-radius:14px;padding:14px 17px;margin-top:18px!important}.premium-security>span{width:31px;height:31px;border-radius:50%;background:#d7f5e4;color:#15925a;display:grid;place-items:center}.premium-security b{font-size:11px}.premium-security p{margin:3px 0 0;font-size:9px;color:#70818c}.premium-security a{margin-left:auto;color:#0b6c9f;font-size:10px;text-decoration:none}.mobile-bottom-nav{display:none}.premium-loading{min-height:100vh;background:#f7f9fb;display:grid;place-items:center;color:#627681}.premium-loading>div{text-align:center}.premium-loading .loading-mark{width:52px;height:52px;border-radius:14px;background:#086a9d;color:#fff;display:grid;place-items:center;font-weight:800;margin:auto}.premium-loading p{margin-top:14px}
        @media(max-width:1050px){.responsive-sidebar{width:220px}.premium-main{margin-left:220px;width:calc(100% - 220px)}.premium-main.sidebar-collapsed{margin-left:82px;width:calc(100% - 82px)}.today-actions{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:850px){.responsive-sidebar:not(.mobile-drawer){display:none}.premium-main,.premium-main.sidebar-collapsed{margin-left:0;width:100%;padding-bottom:90px}.premium-header{height:72px;padding:0 16px}.header-title h1{font-size:17px}.mobile-menu{display:block;border:0;background:#f3f6f8;color:#61727d;border-radius:9px;width:36px;height:36px;font-size:18px;cursor:pointer}.header-tools .notification{display:none}.premium-main>section{width:calc(100% - 24px)}.premium-balance-card{margin-top:12px!important;border-radius:18px;padding:18px}.balance-time{font-size:15px}.balance-time small{font-size:8px}.available-row{margin:24px 0 18px}.available-row strong{font-size:28px}.balance-account-row{display:grid;grid-template-columns:38px 1fr auto;gap:7px}.balance-account-row .active-badge{grid-column:2}.balance-account-row a{margin-left:0;text-align:center}.balance-account-row a+a{grid-column:3;grid-row:2}.today-panel{padding:18px;margin-top:12px!important}.today-heading h2{font-size:18px}.today-actions{grid-template-columns:1fr 1fr;gap:10px}.today-actions a{min-height:112px}.premium-content-grid{grid-template-columns:1fr;margin-top:12px!important}.premium-security{margin-top:12px!important}.sidebar-backdrop{display:block;position:fixed;inset:0;background:rgba(20,39,52,.34);backdrop-filter:blur(2px);border:0;z-index:80}.responsive-sidebar.mobile-drawer{display:flex;width:min(310px,88vw);box-shadow:18px 0 40px rgba(18,42,58,.18);z-index:90}.responsive-sidebar.mobile-drawer .brand-text,.responsive-sidebar.mobile-drawer .sidebar-user-copy,.responsive-sidebar.mobile-drawer .sidebar-label,.responsive-sidebar.mobile-drawer .sidebar-nav span,.responsive-sidebar.mobile-drawer .sidebar-secure div,.responsive-sidebar.mobile-drawer .sidebar-signout span{display:block}.mobile-bottom-nav{position:fixed;display:flex;align-items:center;justify-content:space-around;left:12px;right:12px;bottom:10px;height:68px;background:rgba(255,255,255,.97);border:1px solid #e3e9ed;border-radius:20px;box-shadow:0 12px 30px rgba(25,52,70,.14);z-index:50}.mobile-bottom-nav>a:not(.bottom-center){display:flex;flex-direction:column;align-items:center;gap:4px;color:#7a8992;font-size:9px;text-decoration:none}.mobile-bottom-nav>a.active{color:#0a699a}.mobile-bottom-nav i{font-style:normal;font-size:19px}.mobile-bottom-nav .bottom-center{width:58px;height:58px;margin-top:-31px;border-radius:50%;display:grid;place-items:center;background:#086a9d;color:#fff;border:4px solid #fff;box-shadow:0 7px 18px rgba(8,106,157,.3);text-decoration:none;font-size:23px}}
        @media(max-width:430px){.header-title h1{font-size:15px}.balance-greeting b{font-size:12px}.balance-time{font-size:13px}.available-row strong{font-size:25px}.today-actions a{min-height:105px}.card-number{font-size:15px}.premium-security{padding:12px}.premium-security a{display:none}}
      `}</style>
    </main>
  );
}
