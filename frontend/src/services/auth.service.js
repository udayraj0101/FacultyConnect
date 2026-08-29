import api, { tokenStorage } from './api';

export async function signup({ name, email, password, designation, institutionId, consent }) {
  const { data } = await api.post('/auth/signup', {
    name,
    email,
    password,
    designation,
    institutionId: institutionId || undefined,
    consent,
  });
  tokenStorage.set({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.faculty,
  });
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
  tokenStorage.set({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.faculty,
  });
  return data.faculty;
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  tokenStorage.set({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.faculty,
  });
  return data.faculty;
}

export function logout() {
  tokenStorage.clear();
}
