import api from './api';

export async function listJobs(filters = {}) {
  const params = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return;
    params[k] = Array.isArray(v) ? v.join(',') : v;
  });
  const { data } = await api.get('/jobs', { params });
  return data;
}

export async function getJob(id) {
  const { data } = await api.get(`/jobs/${id}`);
  return data.job;
}

export async function createJob(payload) {
  const { data } = await api.post('/jobs', payload);
  return data.job;
}

export async function applyToJob(id) {
  const { data } = await api.post(`/jobs/${id}/apply`);
  return data.application;
}

export async function listApplicants(jobId) {
  const { data } = await api.get(`/jobs/${jobId}/applicants`);
  return data;
}

export async function updateApplicationStatus(jobId, appId, { status, notes }) {
  const { data } = await api.patch(`/jobs/${jobId}/applicants/${appId}`, { status, notes });
  return data.application;
}

export async function listMyApplications() {
  const { data } = await api.get('/jobs/mine/applications');
  return data.applications;
}

export async function listMyPostings() {
  const { data } = await api.get('/jobs/mine/postings');
  return data.jobs;
}

export async function setJobStatus(id, status) {
  const { data } = await api.patch(`/jobs/${id}/status`, { status });
  return data.job;
}

// CA-04 edit route. Partial patch — only fields present in `patch`
// are updated.
export async function updateJob(id, patch) {
  const { data } = await api.patch(`/jobs/${id}`, patch);
  return data.job;
}

// CA-04 delete route. Defaults to archive (soft delete); `hard=true`
// removes the doc entirely and fails if any applications reference it.
export async function deleteJob(id, { hard = false } = {}) {
  const { data } = await api.delete(`/jobs/${id}`, {
    params: hard ? { hard: 'true' } : undefined,
  });
  return data;
}

// Admin-scoped applicant review — returns the same shape as PublicProfile
// bypassing the publicProfileEnabled opt-in gate (applying is implicit
// consent for the posting admin). Contact fields included.
export async function getApplicantProfile(jobId, appId) {
  const { data } = await api.get(`/jobs/${jobId}/applicants/${appId}/profile`);
  return data.profile;
}

// Save the current reviewer's notes + scorecard on an application.
// Notes are shared across all reviewers; the scorecard row is
// upserted for the current user only. Pass { removeMyScorecard: true }
// to delete the current reviewer's scorecard entirely.
export async function saveApplicantReview(jobId, appId, payload) {
  const { data } = await api.patch(`/jobs/${jobId}/applicants/${appId}/review`, payload);
  return data.application;
}

// Server streams a PDF; we save it via an object URL. Same trigger
// pattern as the faculty self-download in faculty.service.js so the
// browser prompts a Save-As instead of navigating.
export async function downloadApplicantCv(jobId, appId, template = 'generic') {
  const response = await api.get(`/jobs/${jobId}/applicants/${appId}/cv`, {
    responseType: 'blob',
    params: template && template !== 'generic' ? { template } : undefined,
  });
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : 'applicant-cv.pdf';
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
