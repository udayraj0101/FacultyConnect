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
