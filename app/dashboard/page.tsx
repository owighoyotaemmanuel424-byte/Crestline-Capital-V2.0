"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export default function Dashboard(){
 const session=authClient.useSession();
 const user=useQuery(api.users.me,session.data?{}:"skip");
 const tx=useQuery(api.transactions.listMine,session.data?{limit:5}:"skip");
 if(session.isPending||user===undefined||tx===undefined)return <main className="premium-loading"><div><div className="loading-mark">C</div><p>Loading your secure banking experience…</p></div></main>;
 if(!session.data||!user)return null;
 return <main className="bank-app"><header className="bank-top"><Link className="brand" href="/"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></Link><Link className="top-link" href="/account">Account</Link></header><section className="bank-content"><div className="page-title"><span className="eyebrow">PERSONAL BANKING</span><h1>Good Morning, {user.name.split(" ")[0]}</h1><p>Your account is connected to the Convex banking ledger.</p></div><div className="dashboard-panel balance-panel"><small>AVAILABLE BALANCE</small><strong>${Number(user.balance||0).toLocaleString("en-US",{minimumFractionDigits:2})} {user.currency||"USD"}</strong><div className="account-number">Account • {user.accountNumber}</div></div><div className="dashboard-actions"><Link href="/transfer">↗ Send money</Link><Link href="/deposit">＋ Deposit</Link><Link href="/transactions">▥ Transactions</Link><Link href="/cards">▣ Cards</Link></div><div className="dashboard-panel"><div className="premium-section-title"><div><small>RECENT ACTIVITY</small><h2>Transactions</h2></div><Link href="/transactions">View all</Link></div>{tx.length===0?<p>No transactions yet.</p>:tx.map(t=><div className="customer-transaction" key={t.id}><span className="merchant-icon">{t.direction==='credit'?'↓':'↑'}</span><div><strong>{t.counterparty}</strong><small>{t.description||t.type} · {new Date(t.createdAt).toLocaleString()}</small></div><b className={t.direction==='credit'?'positive':''}>{t.direction==='credit'?'+':'-'}${Number(t.amount).toFixed(2)}</b></div>)}</div></section></main>;
}
