import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Inject admin token
adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('gmc-admin-auth');
    if (stored) {
      try {
        const { state } = JSON.parse(stored);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch { /* ignore */ }
    }
  }
  return config;
});

// Auto-refresh on 401
adminApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = localStorage.getItem('gmc-admin-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken: state.refreshToken,
          });
          // Update stored tokens
          const updated = { ...state, accessToken: data.data.accessToken, refreshToken: data.data.refreshToken };
          localStorage.setItem('gmc-admin-auth', JSON.stringify({ state: updated }));
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return adminApi(original);
        }
      } catch {
        localStorage.removeItem('gmc-admin-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
