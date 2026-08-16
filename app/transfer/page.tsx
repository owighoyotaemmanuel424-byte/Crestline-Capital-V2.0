"use client";

import { FormEvent, useEffect, useState } from "react";
import { Moon, Bell, ChevronDown, Home, Send, PlusCircle, TrendingUp, CreditCard, Settings, Headphones, Grid } from "lucide-react";
import { api } from "@/lib/api";

type TransferType = "local" | "international" | "member";
type FormData = { accountName: string; accountNumber: string; bankName: string; routingNumber: string; description: string; pin: string; saveBeneficiary: boolean };
type Recipient = { name: string; accountNumber: string } | null;
type NavItem = [string, string, React.ComponentType<{ size?: number }>];

const nav: NavItem[] = [['Home','/dashboard',Home],['Transfer','/transfer',Send],['Deposit','/deposit',PlusCircle],['Activity','/transactions',TrendingUp],['Cards','/cards',CreditCard],['Settings','/account',Settings],['Support','/support',Headphones],['More','/dashboard',Grid]] as const;

export default function TransferPage(){
  const [transferType, setTransferType] = useState<TransferType>('local');
  const [amount, setAmount] = useState('');
  const [formData, setFormData] = useState<FormData>({accountName:'', accountNumber:'', bankName:'', routingNumber:'', description:'', pin:'', saveBeneficiary:false});
  const [recipient, setRecipient] = useState<Recipient>(null);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [dark, setDark] = useState(false);
  const [region, setRegion] = useState('US EN');
  const [transferKey, setTransferKey] = useState('');

  const value = Number(amount) || 0;
  const fee = transferType === 'member' ? 0 : transferType === 'international' ? Math.min(50, Math.max(5, value * .01)) : 0;
  const total = value + fee;

  const set = (key: keyof FormData, val: string | boolean) => setFormData(x => ({ ...x, [key]: val }));

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const token = localStorage.getItem('crestline_token');
        if (!token) return;
        const r = await api.get('/user');
        if (live) setAvailable(Number(r.data.user?.balance ?? r.data.balance ?? 0));
      } catch {}
    })();
    return () => { live = false };
  }, []);

  useEffect(() => {
    setRecipient(null);
    if (!/^\d{10,20}$/.test(formData.accountNumber)) return;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const r = await api.get(`/transfer/recipient/${formData.accountNumber}`);
        setRecipient(r.data.recipient);
        set('accountName', r.data.recipient.name);
      } catch {
        setRecipient(null);
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.accountNumber]);

  const max = () => setAmount(available.toFixed(2));

  function review(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!formData.accountNumber) return setError('Enter a recipient account number');
    if (value <= 0) return setError('Enter a valid amount');
    if (value > available) return setError('Insufficient available balance');
    if (transferType === 'member' && !recipient) return setError('Enter a valid Crestline member account');
    if (formData.pin.length < 4) return setError('Enter your transaction PIN');
    setConfirm(true);
  }

  async function submit() {
    setLoading(true);
    setError('');
    const key = transferKey || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    setTransferKey(key);
    try {
      const type = transferType === 'member' ? 'internal' : 'external';
      const r = await api.post('/transfer', {
        recipientAccountNumber: formData.accountNumber,
        amount: value,
        type,
        description: formData.description,
        pin: formData.pin,
        saveBeneficiary: formData.saveBeneficiary,
        region,
      }, { headers: { 'Idempotency-Key': key } });
      setSuccess(`Transfer successful ✓ ${r.data.reference || 'Transaction submitted'}`);
      setConfirm(false);
      setAmount('');
      setFormData(x => ({ ...x, accountName: '', accountNumber: '', bankName: '', routingNumber: '', description: '', pin: '' }));
      setRecipient(null);
      setTransferKey('');
      setAvailable(x => Math.max(0, x - total));
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const presets = ['100.00', '500.00', '1000.00'];

  return <div className={dark ? 'min-h-screen bg-slate-950 pb-28 text-white' : 'min-h-screen bg-slate-50 pb-28 text-slate-900'}>
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-5 pt-5 sm:px-8"><a href="/dashboard" className="flex items-center gap-3"><span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white"><span className="absolute bottom-2 h-0 w-0 border-l-[11px] border-r-[11px] border-b-[15px] border-l-transparent border-r-transparent border-b-white" /><span className="absolute bottom-2 h-0.5 w-6 rounded bg-white" /></span><span className="text-lg font-bold">Crestline Capital</span></a><div className="flex gap-2"><button aria-label="Toggle dark mode" onClick={() => setDark(x => !x)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Moon size={18}/></button><button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Bell size={18}/><span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] text-white">1</span></button></div></header>
    <main className="mx-auto max-w-2xl px-4 sm:px-8"><div className="mb-5"><p className="text-xs font-semibold tracking-[.14em] text-sky-500">MONEY MOVEMENT</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Transfer Money</h1><p className={dark ? 'mt-1 text-sm text-slate-400' : 'mt-1 text-sm text-slate-500'}>Send money securely from your Crestline account.</p></div>
     <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">{
       ([['local','Local'],['international','International'],['member','To a Member']] as const).map(([v,l]) => <button key={v} onClick={() => setTransferType(v)} className={`min-w-[110px] flex-1 rounded-xl px-3 py-3 text-xs font-medium transition sm:text-sm ${transferType === v ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{l}</button>)
     }</div>
     {success && <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✓ {success}</div>}
     {error && <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <form onSubmit={review} className="space-y-4">
      <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><label className="font-semibold">Amount</label><span className="text-xs text-slate-400">Available: {available.toLocaleString('en-US', {minimumFractionDigits:2})}</span></div><div className="mt-3 flex items-center rounded-2xl border border-slate-200 p-4"><span className="mr-3 font-bold text-slate-500">US$</span><input aria-label="Transfer amount" className="w-full bg-transparent text-3xl font-bold text-slate-700 outline-none" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0.00" inputMode="decimal"/></div><div className="mt-3 grid grid-cols-4 gap-2">{presets.map(x => <button type="button" key={x} onClick={() => setAmount(x)} className="rounded-xl bg-slate-100 px-1 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"><>{Number(x).toLocaleString()}</></button>)}<button type="button" onClick={max} className="rounded-xl bg-sky-500 px-1 py-2 text-xs font-medium text-white">Max</button></div><p className="mt-3 text-xs text-slate-400">Transfer fee: {fee===0?'0%':`$${ fee.toFixed(2)}`}</p></section>
      <section className="space-y-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><Field label="Account Name" placeholder="Recipient full name" value={formData.accountName} onChange={v => set('accountName', v)} disabled={!!recipient}/><Field label="Account Number / IBAN" placeholder="Account number / IBAN" value={formData.accountNumber} onChange={v => set('accountNumber', v)} suffix={checking?'Checking✓':recipient?'✓ Verified':''}/><label className="block text-sm font-semibold text-slate-700">Language / Region<div className="relative mt-2"><select value={region} onChange={e => setRegion(e.target.value)} className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-800 outline-none focus:border-sky-400"><option>US EN</option><option>GB EN</option><option>CA EN</option><option>AU EN</option></select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/></div></label>{transferType !== 'member' && <><Field label="Bank Name" placeholder="Recipient bank name" value={formData.bankName} onChange={v => set('bankName', v)}/><div className="grid gap-4 sm:grid-cols-2"><Field label="Account Type" placeholder="Checking or Savings" value={(formData as Record<string, unknown>).accountType as string || ''} onChange={v => set('accountType' as keyof FormData, v)}/><Field label="Routing Number (Optional)" placeholder="Routing number" value={formData.routingNumber} onChange={v => set('routingNumber', v)}/></div></>}
        <Field label="Description / Payment Reference" placeholder="Reference note" value={formData.description} onChange={v => set('description', v)}/>
        <Field label="Transaction PIN" placeholder="Enter your PIN" value={formData.pin} onChange={v => set('pin', v.replace(/\D/g, ''))} type="password"/>
        <label className="flex items-center gap-3 text-sm text-slate-600"><input type="checkbox" checked={formData.saveBeneficiary} onChange={e => set('saveBeneficiary', e.target.checked)} className="h-4 w-4 accent-sky-500"/>Save as beneficiary</label>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex justify-between text-sm text-slate-500"><span>Transfer</span><span>${value.toFixed(2)}</span></div>
          <div className="mt-2 flex justify-between text-sm text-slate-500"><span>Fee</span><span>${fee.toFixed(2)}</span></div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold"><span>Total deduction</span><span>${total.toFixed(2)}</span></div>
        </div>
        <button type="submit" className="w-full rounded-2xl bg-sky-500 py-3.5 font-semibold text-white transition hover:bg-sky-600 active:scale-[.99]">Continue</button>
      </section>
     </form>
    </main>
    <nav className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-5xl rounded-full border px-3 py-2 shadow-xl ${dark ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-white'}`}><div className="flex items-center gap-1 overflow-x-auto">{nav.map(([label, href, Icon]) => <a key={label} href={href} className={`flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold sm:flex-row sm:text-xs ${label === 'Transfer' ? 'bg-sky-500 text-white' : 'text-slate-500'}`}><Icon size={17}/><span>{label}</span></a>)}</div></nav>
    {confirm && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-5"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold tracking-wider text-sky-500">CONFIRM TRANSFER</p><h2 className="mt-1 text-xl font-bold text-slate-900">Review payment</h2></div><button onClick={() => !loading && setConfirm(false)} className="text-2xl text-slate-400">×</button></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{formData.accountName || 'Recipient'}</p><p className="text-sm text-slate-500">{formData.accountNumber}</p><p className="mt-4 text-sm text-slate-500">Total deduction</p><p className="text-3xl font-bold text-slate-900">${total.toFixed(2)}</p></div><button onClick={() => void submit()} disabled={loading || formData.pin.length < 4} className="mt-5 w-full rounded-2xl bg-sky-500 py-3.5 font-semibold text-white disabled:opacity-50">{loading ? 'Sending…' : 'Confirm & Send'}</button></div></div>}
  </div>
}

function Field({ label, placeholder, value, onChange, type = 'text', suffix, disabled = false }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; suffix?: string; disabled?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<div className="relative mt-2"><input type={type} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-24 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"/>{suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">{suffix}</span>}</div></label>
}
