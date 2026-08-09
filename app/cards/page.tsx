"use client";

import { useEffect, useState } from "react";
import { applyForCard, getMyCards } from "./actions";

type Card = { id: string; last4: string; brand: string; type: string; status: string; spendingLimit: number; issuedAt?: string; createdAt?: string };

const statusStyle: Record<string, string> = { active: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", frozen: "bg-sky-50 text-sky-700", revoked: "bg-rose-50 text-rose-700" };

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [show, setShow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const token = typeof window !== "undefined" ? localStorage.getItem("crestline_token") : null;
    if (!token) return;
    try { setCards(await getMyCards(token)); } catch (e: any) { setError(e?.message || "Unable to load cards"); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function apply(type: "virtual" | "physical") {
    const token = localStorage.getItem("crestline_token");
    if (!token) { setError("Please sign in again."); return; }
    setApplying(true); setError(""); setMessage("");
    try { const result = await applyForCard(token, type, "visa"); setMessage(result.message); await load(); }
    catch (e: any) { setError(e?.message || "Unable to submit application"); }
    finally { setApplying(false); }
  }

  return <main className="bank-app"><header className="bank-top"><a className="brand" href="/dashboard"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></a><a className="top-link" href="/dashboard">← Dashboard</a></header><div className="bank-content"><div className="transfer-wrap"><div className="page-title"><span className="eyebrow">CARD MANAGEMENT</span><h1>Your cards</h1><p>Apply for a Crestline card and manage approved cards securely.</p></div>{message&&<div className="dashboard-panel" style={{marginBottom:16,color:'#137a4b'}}>{message}</div>}{error&&<div className="dashboard-panel" style={{marginBottom:16,color:'#b42318'}}>{error}</div>}
  {loading ? <div className="dashboard-panel">Loading your cards…</div> : cards.length === 0 ? <div className="dashboard-panel"><div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'center',flexWrap:'wrap'}}><div><span className="eyebrow">GET STARTED</span><h2 style={{margin:'8px 0 4px'}}>Apply for a Crestline card</h2><p>Choose a card type. Your application will appear in the Admin Cards console for review.</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="dashboard-primary" disabled={applying} onClick={()=>apply('virtual')}>{applying?'Submitting…':'Apply for virtual card'}</button><button className="dashboard-secondary" disabled={applying} onClick={()=>apply('physical')}>Apply for physical card</button></div></div></div> : <div style={{display:'grid',gap:16}}>{cards.map(card=><div className="dashboard-panel" key={card.id}><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div className="customer-bank-card" style={{maxWidth:390}}><span>CRESTLINE CAPITAL</span><div className="chip">▦</div><b>•••• •••• •••• {card.last4}</b><small>CRESTLINE CUSTOMER <i>{String(card.brand).toUpperCase()}</i></small></div><div style={{minWidth:220}}><span className={`pill ${statusStyle[card.status]||'bg-slate-100 text-slate-600'}`} style={{display:'inline-block',padding:'6px 10px',borderRadius:999,fontSize:12,fontWeight:700,textTransform:'capitalize'}}>{card.status}</span><div className="detail-row"><span>Card type</span><b style={{textTransform:'capitalize'}}>{card.type}</b></div><div className="detail-row"><span>Spending limit</span><b>${Number(card.spendingLimit||0).toLocaleString('en-US',{minimumFractionDigits:2})}</b></div>{card.status==='active'&&<button className="dashboard-primary full" onClick={()=>setShow(show===card.id?null:card.id)}>{show===card.id?'Hide card details':'Show card details'}</button>}{card.status==='pending'&&<p style={{fontSize:12,color:'#8b6b00',marginTop:10}}>Application pending administrator approval.</p>}{show===card.id&&<div style={{marginTop:12}}><div className="detail-row"><span>Card number</span><b>•••• •••• •••• {card.last4}</b></div><div className="detail-row"><span>Expiry / CVV</span><b>Protected</b></div></div>}</div></div></div>)}</div>}
  </div></div></main>
}
