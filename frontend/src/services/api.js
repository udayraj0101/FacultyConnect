import axios from 'axios';
import { createLogger } from '../utils/logger';

const logger = createLogger('frontend.api');

const USER_KEY = 'facultyconnect_user';
// Removed per QA report Oct 2026: access token no longer lives in
// localStorage. We keep it in a module-scope variable (resets on tab
// close, invisible to any injected script) and rely on the httpOnly
// refresh cookie to rehydrate on next mount via bootstrapSession().
// Purge any lingering key from users carrying the old client build.
localStorage.removeItem('facultyconnect_access_token');
localStorage.removeItem('facultyconnect_refresh_token');

let accessTokenMemory = null;

export const tokenStorage = {
  getAccess: () => accessTokenMemory,
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
      return null;
    }
  },
  // `user` stays in localStorage because the UI needs to know who it's
  // rendering for on first paint (role-based routes, header avatar)
  // before the refresh round-trip completes. It's not a secret — the
  // same data is in the UI as soon as anyone hits /me.
  set: ({ accessToken, user }) => {
    if (accessToken !== undefined) accessTokenMemory = accessToken || null;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    accessTokenMemory = null;
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
  return response.data;
}

/**
 * One-shot session rehydration called by AuthProvider on mount when
 * the user is remembered from a previous session. Hits /auth/refresh
 * using the httpOnly cookie so the in-memory access token (gone on
 * page reload) is repopulated BEFORE the first authenticated API call
 * fires. Avoids the ugly bounce-to-login flash that used to happen
 * while the 401 interceptor ran.
 *
 * Returns the fresh faculty object on success, or null if the refresh
 * cookie was missing / expired — caller treats null as logged-out.
 */
export async function bootstrapSession() {
  try {
    const data = await refreshAccessToken();
    return data.faculty || null;
  } catch (err) {
    logger.info('bootstrap refresh failed — treating as logged out', {
      status: err.response?.status,
    });
    tokenStorage.clear();
    return null;
  }
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
        refreshPromise = refreshPromise || refreshAccessToken().then(d => d.accessToken);
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        refreshPromise = null;
        // QA report Oct 2026: anonymous visitors to / used to get bounced
        // to /login because this interceptor forced window.location on
        // any refresh failure. The redirect belongs in the route guard
        // (ProtectedRoute), not here — unauthenticated callers to
        // public endpoints should see a normal 401 and decide for
        // themselves. We still clear local state so stale user data
        // doesn't linger.
        logger.info('refresh failed, clearing session', { error: refreshErr.message });
        tokenStorage.clear();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
