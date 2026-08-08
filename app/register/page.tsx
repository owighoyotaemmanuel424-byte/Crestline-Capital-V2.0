"use client";
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

export default function RegisterPage(){
 const router=useRouter(); const setSession=useAuth(s=>s.setSession); const [form,setForm]=useState({name:'',email:'',password:'',pin:''}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 const change=(k:string,v:string)=>setForm({...form,[k]:v});
 async function submit(e:FormEvent){e.preventDefault();setError('');setLoading(true);try{const r=await api.post('/auth/register',form);setSession(r.data.token,r.data.user);router.push('/dashboard')}catch(err:any){setError(err.response?.data?.message||'Unable to create account')}finally{setLoading(false)}}
 return <main className="auth-page"><div className="auth-card glass"><a className="brand" href="/"><span className="brand-mark">C</span><span>Crestline <b>Capital</b></span></a><span className="eyebrow">OPEN YOUR ACCOUNT</span><h1>Start banking</h1><p>Create a secure digital banking account in minutes.</p><form onSubmit={submit}><label>Full name<input value={form.name} onChange={e=>change('name',e.target.value)} required placeholder="John Doe"/></label><label>Email<input type="email" value={form.email} onChange={e=>change('email',e.target.value)} required placeholder="you@example.com"/></label><label>Password<input type="password" minLength={8} value={form.password} onChange={e=>change('password',e.target.value)} required placeholder="At least 8 characters"/></label><label>Transfer PIN<input inputMode="numeric" pattern="[0-9]{4,6}" value={form.pin} onChange={e=>change('pin',e.target.value)} required placeholder="4–6 digits"/></label>{error&&<div className="form-error">{error}</div>}<button className="dashboard-primary full" disabled={loading}>{loading?'Creating…':'Create account →'}</button></form><div className="auth-footer">Already registered? <a href="/login">Sign in</a></div></div></main>
}
