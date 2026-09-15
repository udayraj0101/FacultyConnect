import axios from 'axios';
import { createLogger } from '../utils/logger';

const logger = createLogger('frontend.api');

const ACCESS_KEY = 'facultyconnect_access_token';
const USER_KEY = 'facultyconnect_user';
// Left over from the pre-cookie refresh flow. Purged on module load so
// stale tokens don't linger in browsers that carried them across the
// upgrade. Safe to remove this cleanup after all active sessions have
// rotated (~30 days).
localStorage.removeItem('facultyconnect_refresh_token');

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  },
  set: ({ accessToken, user }) => {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/v1',
  headers: { 'Content-Type': 'application/json' },
  // Refresh token lives in an httpOnly cookie now (FC-06); withCredentials
  // is what tells the browser to send it back to the API.
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const response = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    {},
    {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
  tokenStorage.set({
    accessToken: response.data.accessToken,
    user: response.data.faculty,
  });
  return response.data.accessToken;
}

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshPromise = null;
        logger.warn('refresh failed, clearing session', { error: refreshErr.message });
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
