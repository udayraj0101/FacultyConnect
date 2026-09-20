import api from './api';

export async function searchDirectory(filters = {}) {
  const params = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return;
    // Zod's csvList expects CSV strings on the wire; join arrays here so
    // the caller can stay array-native.
    params[k] = Array.isArray(v) ? v.join(',') : v;
  });
  const { data } = await api.get('/directory/search', { params });
  return data;
}

export async function getDirectoryProfile(id) {
  const { data } = await api.get(`/directory/faculty/${id}`);
  return data.profile;
}
