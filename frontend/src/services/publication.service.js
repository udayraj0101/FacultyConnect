import api from './api';

export async function listMyPublications() {
  const { data } = await api.get('/faculty/me/publications');
  return data;
}

export async function importFromOrcid() {
  const { data } = await api.post('/faculty/me/import/orcid');
  return data;
}

export async function enrichViaCrossref() {
  const { data } = await api.post('/faculty/me/publications/enrich-crossref');
  return data;
}

export async function importFromScopus(scopusAuthorId) {
  const { data } = await api.post('/faculty/me/import/scopus', { scopusAuthorId });
  return data;
}

export async function importFromScholarCsv(csv) {
  const { data } = await api.post('/faculty/me/import/scholar-csv', { csv });
  return data;
}
