import axios from 'axios';

// The banking UI and API are deployed together. Always use the same-origin
// API so production can never accidentally call localhost or another host.
const baseURL = '/api';

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('crestline_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
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
