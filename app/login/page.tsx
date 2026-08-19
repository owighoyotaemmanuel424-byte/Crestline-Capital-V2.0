"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage(){
 const router=useRouter(); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError("");setLoading(true);try{const result=await authClient.signIn.email({email,password});if(result.error)throw new Error(result.error.message||"Unable to sign in");router.replace("/dashboard")}catch(err:any){setError(err?.message||"Unable to sign in")}finally{setLoading(false)}}
 return <main className="auth-page"><div className="auth-card glass"><Link className="brand" href="/"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></Link><span className="eyebrow">SECURE BANKING</span><h1>Welcome back</h1><p>Sign in to manage your account securely.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"/></label>{error&&<div className="form-error">{error}</div>}<button className="dashboard-primary full" disabled={loading}>{loading?"Signing in…":"Sign in →"}</button></form><div className="auth-footer">New to Crestline? <Link href="/register">Create an account</Link></div></div></main>
}
