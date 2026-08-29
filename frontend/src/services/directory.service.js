import api from './api';

export async function searchDirectory(filters = {}) {
  const params = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v == null || v === '') return;
    params[k] = v;
  });
  const { data } = await api.get('/directory/search', { params });
  return data;
}

export async function getDirectoryProfile(id) {
  const { data } = await api.get(`/directory/faculty/${id}`);
  return data.profile;
}
