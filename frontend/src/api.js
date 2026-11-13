import axios from 'axios';

export const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const api = axios.create({ baseURL: `${API_ROOT}/api` });

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// When the session expires, clear it and send the user to the login page
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('cf_token');
      localStorage.removeItem('cf_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Turns an API error into a readable message
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.errors?.map((e) => e.message).join(' ') || err?.response?.data?.message || fallback;

export default api;
