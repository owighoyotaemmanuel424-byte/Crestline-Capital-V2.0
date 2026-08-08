"use client";

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminSetupPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [name, setName] = useState('Crestline Administrator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/bootstrap/status', { cache: 'no-store' })
      .then(async (r) => r.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        setAvailable(Boolean(data.available));
      })
      .catch(() => setError('Unable to check administrator setup status.'));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, pin, setupSecret }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create administrator.');
      setMessage(`${data.message} Account number: ${data.user.accountNumber}`);
      setAvailable(false);
      setPassword('');
      setPin('');
      setSetupSecret('');
    } catch (err: any) {
      setError(err.message || 'Unable to create administrator.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card glass" style={{ maxWidth: 620 }}>
        <Link className="brand" href="/">
          <span className="brand-mark">C</span>
          <span>Crestline <b>Capital</b></span>
        </Link>
        <span className="eyebrow">ONE-TIME ADMIN SETUP</span>
        <h1>Create administrator</h1>
        <p>Securely create the first Crestline Capital administrator. This setup permanently closes after the first admin is created.</p>

        {configured === false && available === false && (
          <div className="form-error">Admin bootstrap is not enabled. Add <strong>ADMIN_BOOTSTRAP_SECRET</strong> to your Vercel Production environment variables.</div>
        )}
        {configured && available === false && !message && (
          <div className="form-error">Initial administrator setup has already been completed.</div>
        )}
        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}

        {available && !message && (
          <form onSubmit={submit}>
            <label>Administrator name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label>Administrator email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@example.com" /></label>
            <label>Strong password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} placeholder="At least 12 characters" /></label>
            <label>Transfer PIN<input inputMode="numeric" pattern="[0-9]{4,6}" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={4} maxLength={6} placeholder="4–6 digits" /></label>
            <label>Setup secret<input type="password" value={setupSecret} onChange={(e) => setSetupSecret(e.target.value)} required minLength={16} placeholder="Your Vercel ADMIN_BOOTSTRAP_SECRET" /></label>
            <button className="dashboard-primary full" disabled={loading}>{loading ? 'Creating administrator…' : 'Create administrator →'}</button>
          </form>
        )}

        <div className="auth-footer"><Link href="/login">Return to secure login</Link></div>
      </div>
    </main>
  );
}
