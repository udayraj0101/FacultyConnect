import api from './api';

export async function listVerifications(params = {}) {
  const { data } = await api.get('/admin/verifications', { params });
  return data;
}

export async function reviewVerification(id, { decision, reason }) {
  const { data } = await api.patch(`/admin/verifications/${id}`, { decision, reason });
  return data.request;
}

export async function getPlatformOverview() {
  const { data } = await api.get('/admin/overview');
  return data;
}

export async function getCollegeOverview() {
  const { data } = await api.get('/faculty/me/college-overview');
  return data;
}
