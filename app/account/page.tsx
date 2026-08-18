"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Account() {
  const router = useRouter();
  const user = useQuery(api.users.me);
  useEffect(() => { if (user === null) router.push("/login"); }, [user, router]);
  if (user === undefined) return <main className="dashboard-loading">Loading…</main>;
  if (user === null) return null;
  return <main className="bank-app"><header className="bank-top"><a className="brand" href="/dashboard"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></a><a className="top-link" href="/dashboard">← Dashboard</a></header><div className="bank-content"><div className="transfer-wrap"><div className="page-title"><span className="eyebrow">ACCOUNT PROFILE</span><h1>Your account</h1></div><div className="dashboard-panel"><div className="detail-row"><span>Account name</span><b>{user.name}</b></div><div className="detail-row"><span>Email</span><b>{user.email}</b></div><div className="detail-row"><span>Account number</span><b>{user.accountNumber} <button className="text-button" onClick={() => navigator.clipboard.writeText(user.accountNumber)}>Copy</button></b></div><div className="detail-row"><span>Account type</span><b>Primary Checking</b></div><div className="detail-row"><span>Available balance</span><b>{user.balance.toFixed(2)} {user.currency}</b></div></div></div></div></main>;
}
