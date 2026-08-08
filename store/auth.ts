import { create } from 'zustand';

type User = { id: string; _id?: string; name: string; email: string; accountNumber: string; balance: number; isAdmin: boolean; isFrozen: boolean };
type AuthState = { user: User | null; token: string | null; setSession: (token: string, user: User) => void; clear: () => void; setUser: (user: User) => void };

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  setSession: (token, user) => { if (typeof window !== 'undefined') localStorage.setItem('crestline_token', token); set({ token, user }); },
  clear: () => { if (typeof window !== 'undefined') localStorage.removeItem('crestline_token'); set({ token: null, user: null }); },
  setUser: user => set({ user })
}));
