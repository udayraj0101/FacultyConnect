import api, { tokenStorage } from './api';
import { createLogger } from '../utils/logger';

const logger = createLogger('frontend.authService');

export async function signup({ name, email, password, designation, institutionId, consent }) {
  const { data } = await api.post('/auth/signup', {
    name,
    email,
    password,
    designation,
    institutionId: institutionId || undefined,
    consent,
  });
  tokenStorage.set({ accessToken: data.accessToken, user: data.faculty });
  return data.faculty;
}

export async function previewOnboarding(token) {
  const { data } = await api.get(`/auth/onboarding/${encodeURIComponent(token)}`);
  return data;
}

export async function completeOnboarding(token, { password, consent }) {
  const { data } = await api.post(`/auth/onboarding/${encodeURIComponent(token)}/complete`, {
    password,
    consent,
  });
  tokenStorage.set({ accessToken: data.accessToken, user: data.faculty });
  return data.faculty;
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  tokenStorage.set({ accessToken: data.accessToken, user: data.faculty });
  return data.faculty;
}

export async function logout() {
  // Server-side call revokes the refresh cookie (both the JWT hash on the
  // Faculty document and the Set-Cookie header on the response). If the
  // server is unreachable we still clear local state so the user isn't
  // stuck in a logged-in-looking shell.
  try {
    await api.post('/auth/logout');
  } catch (err) {
    logger.warn('logout call failed', { message: err.message });
  }
  tokenStorage.clear();
}
