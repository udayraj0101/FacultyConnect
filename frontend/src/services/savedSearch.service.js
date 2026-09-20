import api from './api';

export async function listSavedSearches() {
  const { data } = await api.get('/saved-searches');
  return data.savedSearches || [];
}

export async function createSavedSearch(payload) {
  const { data } = await api.post('/saved-searches', payload);
  return data.savedSearch;
}

export async function updateSavedSearch(id, patch) {
  const { data } = await api.patch(`/saved-searches/${id}`, patch);
  return data.savedSearch;
}

export async function deleteSavedSearch(id) {
  const { data } = await api.delete(`/saved-searches/${id}`);
  return data;
}

export async function runSavedSearch(id) {
  const { data } = await api.get(`/saved-searches/${id}/results`);
  return data;
}
