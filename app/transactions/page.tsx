"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export default function Transactions(){
 const session=authClient.useSession(); const tx=useQuery(api.transactions.listMine,session.data?{limit:100}:"skip"); const [filter,setFilter]=useState("all"); const shown=(tx||[]).filter(t=>filter==="all"||t.direction===filter);
 if(session.isPending||tx===undefined)return <main className="premium-loading"><div><div className="loading-mark">C</div><p>Loading your transactions…</p></div></main>;
 if(!session.data)return <main className="bank-app"><div className="bank-content"><a href="/login">Sign in to view transactions</a></div></main>;
 return <main className="bank-app"><header className="bank-top"><a className="brand" href="/dashboard"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></a><a className="top-link" href="/dashboard">← Dashboard</a></header><div className="bank-content"><div className="transfer-wrap"><div className="page-title"><span className="eyebrow">ACCOUNT ACTIVITY</span><h1>Transactions</h1><p>Review your account activity and transfer references.</p></div><div className="dashboard-panel"><div className="filter-row"><button className={filter==='all'?'filter active':'filter'} onClick={()=>setFilter('all')}>All</button><button className={filter==='credit'?'filter active':'filter'} onClick={()=>setFilter('credit')}>Credits</button><button className={filter==='debit'?'filter active':'filter'} onClick={()=>setFilter('debit')}>Debits</button></div>{shown.map(t=><div className="customer-transaction" key={t.id}><span className="merchant-icon">{t.direction==='credit'?'↓':'↑'}</span><div><strong>{t.counterparty}</strong><small>{t.description||t.type} · {new Date(t.createdAt).toLocaleString()} · {t.reference}</small></div><b className={t.direction==='credit'?'positive':''}>{t.direction==='credit'?'+':'-'}${t.amount.toFixed(2)}<small>{t.status}</small></b></div>)}</div></div></div></main>
}
