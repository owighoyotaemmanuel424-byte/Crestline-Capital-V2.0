"use client";
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

export default function LoginPage(){
 const router=useRouter(); const setSession=useAuth(s=>s.setSession); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setError('');setLoading(true);try{const r=await api.post('/auth/login',{email,password});setSession(r.data.token,r.data.user);router.push('/dashboard')}catch(err:any){setError(err.response?.data?.message||'Unable to sign in')}finally{setLoading(false)}}
 return <main className="auth-page"><div className="auth-card glass"><a className="brand" href="/"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></a><span className="eyebrow">SECURE BANKING</span><h1>Welcome back</h1><p>Sign in to manage your money securely.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••"/></label>{error&&<div className="form-error">{error}</div>}<button className="dashboard-primary full" disabled={loading}>{loading?'Signing in…':'Sign in →'}</button></form><div className="auth-footer">New to Crestline? <a href="/register">Create an account</a></div></div></main>
}
