import api from './api';

export async function listOpportunities(filters = {}) {
  const params = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return;
    params[k] = Array.isArray(v) ? v.join(',') : v;
  });
  const { data } = await api.get('/opportunities', { params });
  return data;
}

export async function getOpportunity(id) {
  const { data } = await api.get(`/opportunities/${id}`);
  return data.opportunity;
}

export async function toggleBookmark(id) {
  const { data } = await api.post(`/opportunities/${id}/bookmark`);
  return data;
}

export async function listMyBookmarks() {
  const { data } = await api.get('/opportunities/mine/bookmarks');
  return data.opportunities;
}

export async function createOpportunity(payload) {
  const { data } = await api.post('/opportunities', payload);
  return data;
}

export async function listMyOpportunities() {
  const { data } = await api.get('/opportunities/mine/postings');
  return data.opportunities;
}
