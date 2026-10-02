// One shared axios instance for the whole app.
// - Adds the JWT from localStorage to every request.
// - Turns the backend's { error: { message, details } } into a readable Error.
// - On 401 (token expired) it logs the user out.
import axios from 'axios';

export const TOKEN_KEY = 'servicedesk_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data?.error;
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    const err = new Error(body?.message || error.message || 'Request failed');
    err.code = body?.code;
    err.details = body?.details;
    err.status = error.response?.status;
    return Promise.reject(err);
  },
);

// Builds "a=1&b=2", skipping empty values.
export function qs(params) {
  const clean = Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null);
  return new URLSearchParams(clean).toString();
}

export default api;
