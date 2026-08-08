"use client";

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function signOut() {
    logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Crestline Capital</p>
          <h1 className="text-base font-semibold text-slate-950 sm:text-lg">Admin control center</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:flex">
            <span className="font-medium">Balance</span>
            <span className="font-bold text-slate-950">${Number(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <select aria-label="Language" defaultValue="EN" className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
            <option>EN</option>
          </select>
          <button onClick={signOut} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 font-semibold text-white">{user?.name?.slice(0, 1).toUpperCase() || 'A'}</span>
            <span className="hidden sm:inline">{user?.name || 'Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
