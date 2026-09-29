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

export async function inviteFaculty({ email, name, allowDomainMismatch = false }) {
  const { data } = await api.post('/institutions/faculty/invite', {
    email,
    name,
    allowDomainMismatch,
  });
  return data;
}

export async function bulkInviteFaculty(invites, { allowDomainMismatch = false } = {}) {
  const { data } = await api.post('/institutions/faculty/bulk-invite', {
    invites,
    allowDomainMismatch,
  });
  return data;
}

// CA-01 offboard endpoint. `purge=true` hard-deletes an unclaimed
// invite; omitting purge (or purge=false) detaches a claimed roster
// member without deleting their account.
export async function offboardFaculty(id, { purge = false } = {}) {
  const { data } = await api.delete(`/institutions/faculty/${id}`, {
    data: { purge },
  });
  return data;
}

// Re-issue the onboarding token + resend the invite email. Server
// refuses to resend to accounts that already have a password
// (ALREADY_ONBOARDED) or that belong to another institution
// (FORBIDDEN). Old links become invalid on success — the fresh token
// invalidates the previous hash.
export async function resendFacultyInvite(id) {
  const { data } = await api.post(`/institutions/faculty/${id}/resend-invite`);
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
