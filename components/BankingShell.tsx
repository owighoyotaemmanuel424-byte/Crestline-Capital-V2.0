"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";

const items = [["⌂", "Home", "/dashboard"], ["↗", "Send money", "/transfer"], ["▥", "Transactions", "/transactions"], ["▣", "Cards", "/cards"], ["♙", "Account", "/account"]] as const;

export default function BankingShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState(auth.user?.name || "Customer");

  useEffect(() => {
    if (auth.user?.name) { setUserName(auth.user.name); return; }
    api.get("/user").then((r) => { auth.setUser(r.data.user); setUserName(r.data.user.name || "Customer"); }).catch(() => router.push("/login"));
  }, [auth, router]);
  useEffect(() => setOpen(false), [pathname]);

  const firstName = userName.split(" ")[0] || "Customer";
  const signOut = () => { auth.clear(); router.push("/login"); };
  const active = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return <main className="bank-shell">
    <style jsx global>{`
      .bank-shell{min-height:100vh;background:#f7f9fb;color:#172a3a;display:flex;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .app-sidebar{position:fixed;inset:0 auto 0 0;width:248px;background:#fff;border-right:1px solid #e5ebef;padding:24px 15px;display:flex;flex-direction:column;z-index:100;transition:transform .25s ease,box-shadow .25s ease}
      .app-brand{display:flex;align-items:center;gap:10px;padding:2px 10px 25px;color:#101c27;text-decoration:none}.app-brand-mark{width:38px;height:38px;border-radius:11px;background:#0a6c9f;color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px}.app-brand strong{font-size:17px}.app-brand em{font-style:normal;color:#71808c;font-weight:400;margin-left:4px}
      .app-profile{display:flex;align-items:center;gap:10px;padding:11px;border-radius:13px;background:#f2f7fa;margin-bottom:20px}.app-avatar{width:39px;height:39px;border-radius:50%;display:grid;place-items:center;background:#dfeef5;color:#12658c;font-weight:800;flex:none}.app-profile b,.app-profile small{display:block}.app-profile b{font-size:12px}.app-profile small{font-size:10px;color:#81909b;margin-top:2px}
      .app-nav{display:flex;flex-direction:column;gap:4px}.app-nav a{display:flex;align-items:center;gap:12px;padding:12px 11px;border-radius:10px;color:#71808b;text-decoration:none;font-size:13px;transition:.15s}.app-nav a:hover{background:#f0f7fb;color:#086a9d;transform:translateX(1px)}.app-nav a.active{background:#eaf5fa;color:#086a9d;font-weight:700}.app-nav i{font-style:normal;width:20px;text-align:center;font-size:18px}
      .app-admin-link{color:#7251a8!important;background:#faf6ff!important}.app-protected{margin-top:auto;display:flex;gap:9px;align-items:center;padding:12px;border:1px solid #e6edf1;border-radius:12px}.app-protected>span{width:29px;height:29px;border-radius:50%;background:#e3f8ec;color:#15965b;display:grid;place-items:center}.app-protected b,.app-protected small{display:block}.app-protected b{font-size:10px}.app-protected small{font-size:9px;color:#84929c;margin-top:2px}.app-signout{margin-top:10px;width:100%;border:0;background:#f5f7f8;color:#64737e;padding:11px;border-radius:10px;text-align:left;cursor:pointer;font-size:12px}
      .app-shell-content{margin-left:248px;width:calc(100% - 248px);min-width:0}.app-mobile-top,.app-backdrop,.app-bottom-nav,.app-mobile-close{display:none}
      @media(max-width:850px){.bank-shell{display:block}.app-sidebar{width:280px;transform:translateX(-105%);box-shadow:none}.app-sidebar.open{transform:translateX(0);box-shadow:18px 0 45px rgba(23,48,66,.16)}.app-shell-content{margin-left:0;width:100%;padding-top:62px}.app-mobile-top{position:fixed;top:0;left:0;right:0;height:62px;background:rgba(255,255,255,.97);border-bottom:1px solid #e5ebef;display:flex;align-items:center;justify-content:space-between;padding:0 15px;z-index:80}.app-menu-btn{border:0;background:#f1f5f7;color:#50616c;width:38px;height:38px;border-radius:10px;font-size:21px;cursor:pointer}.app-mobile-brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px}.app-mobile-brand span{width:30px;height:30px;border-radius:9px;background:#0a6c9f;color:#fff;display:grid;place-items:center}.app-mobile-user{width:36px;height:36px;border-radius:50%;background:#0a6c9f;color:#fff;display:grid;place-items:center;font-weight:800;font-size:12px}.app-backdrop{display:block;position:fixed;inset:0;background:rgba(18,36,49,.28);backdrop-filter:blur(2px);z-index:90;border:0}.app-sidebar.open{z-index:110}.app-mobile-close{display:block;position:absolute;right:14px;top:15px;border:0;background:#f1f5f7;color:#50616c;width:38px;height:38px;border-radius:10px;font-size:22px}.app-sidebar .app-brand{padding-right:52px}.app-bottom-nav{position:fixed;display:flex;align-items:center;justify-content:space-around;left:12px;right:12px;bottom:10px;height:68px;background:rgba(255,255,255,.97);border:1px solid #e2e9ed;border-radius:20px;box-shadow:0 12px 30px rgba(25,52,70,.14);z-index:70}.app-bottom-nav a{display:flex;flex-direction:column;align-items:center;gap:3px;color:#7a8992;text-decoration:none;font-size:9px}.app-bottom-nav a.active{color:#0a699a}.app-bottom-nav i{font-style:normal;font-size:18px}.app-bottom-nav .bottom-transfer{width:58px;height:58px;margin-top:-31px;border-radius:50%;display:grid;place-items:center;background:#086a9d;color:#fff;border:4px solid #fff;box-shadow:0 7px 18px rgba(8,106,157,.3)}}
    `}</style>
    <aside className={`app-sidebar${open ? " open" : ""}`} aria-label="Banking navigation">
      <Link className="app-brand" href="/dashboard"><span className="app-brand-mark">C</span><strong>Crestline<em>Capital</em></strong></Link>
      <button className="app-mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">×</button>
      <div className="app-profile"><div className="app-avatar">{firstName[0]?.toUpperCase()}</div><div><b>{userName}</b><small>Personal account</small></div></div>
      <nav className="app-nav">{items.map(([icon,label,href]) => <Link key={href} className={active(href) ? "active" : ""} href={href}><i>{icon}</i>{label}</Link>)}{admin && <Link className={`app-admin-link ${pathname.startsWith("/admin") ? "active" : ""}`} href="/admin"><i>⚙</i>Admin control</Link>}</nav>
      <div className="app-protected"><span>✓</span><div><b>Account protected</b><small>Secure session active</small></div></div><button className="app-signout" onClick={signOut}>↪&nbsp; Sign out</button>
    </aside>
    {open && <button className="app-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="app-shell-content"><div className="app-mobile-top"><button className="app-menu-btn" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button><div className="app-mobile-brand"><span>C</span>Crestline Capital</div><div className="app-mobile-user">{firstName[0]?.toUpperCase()}</div></div>{children}</div>
    <nav className="app-bottom-nav"><Link className={pathname === "/dashboard" ? "active" : ""} href="/dashboard"><i>⌂</i><span>Home</span></Link><Link className="bottom-transfer" href="/transfer" aria-label="Send money"><i>↗</i></Link><Link className={pathname.startsWith("/transactions") ? "active" : ""} href="/transactions"><i>▥</i><span>Activity</span></Link><Link className={pathname.startsWith("/cards") ? "active" : ""} href="/cards"><i>▣</i><span>Cards</span></Link></nav>
  </main>;
}
