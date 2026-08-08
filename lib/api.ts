import axios from 'axios';

// In production the Express API is exposed through the same Vercel domain
// via /api. A localhost default causes registration/login to fail on Vercel.
const baseURL = process.env.NEXT_PUBLIC_API_URL?.trim() || '/api';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('crestline_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message = 'Unable to reach Crestline Capital services. Please try again.';
    }
    return Promise.reject(error);
  },
);
