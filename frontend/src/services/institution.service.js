import api from './api';

export async function listInstitutions(params = {}) {
  const { data } = await api.get('/institutions', { params });
  return data;
}

export async function createInstitution(payload) {
  const { data } = await api.post('/institutions', payload);
  return data.institution;
}

export async function getInstitution(id) {
  const { data } = await api.get(`/institutions/${id}`);
  return data.institution;
}

// ---------- College Admin faculty roster ----------

export async function inviteFaculty({ email, name }) {
  const { data } = await api.post('/institutions/faculty/invite', { email, name });
  return data;
}

export async function bulkInviteFaculty(invites) {
  const { data } = await api.post('/institutions/faculty/bulk-invite', { invites });
  return data;
}

export async function listFacultyRoster(params = {}) {
  const { data } = await api.get('/institutions/faculty/roster', { params });
  return data;
}

export async function listPendingFaculty() {
  const { data } = await api.get('/institutions/faculty/pending');
  return data;
}

export async function approveFaculty(id) {
  const { data } = await api.patch(`/institutions/faculty/${id}/approve`);
  return data;
}

export async function rejectFaculty(id, reason) {
  const { data } = await api.patch(`/institutions/faculty/${id}/reject`, { reason });
  return data;
}
