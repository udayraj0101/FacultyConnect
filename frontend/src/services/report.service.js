import api from './api';

export const CATEGORY_OPTIONS = [
  { value: 'predatory_journal', label: 'Predatory journal' },
  { value: 'fake_job', label: 'Fake job posting' },
  { value: 'fraudulent_organizer', label: 'Fraudulent organizer' },
  { value: 'harassment', label: 'Harassment / abuse' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export async function fileReport({ targetType, targetId, category, reason }) {
  const { data } = await api.post('/reports', { targetType, targetId, category, reason });
  return data.report;
}

export async function listMyReports() {
  const { data } = await api.get('/reports/mine');
  return data.reports;
}

// Platform Admin
export async function listAdminReports({ status, targetType, page, limit } = {}) {
  const params = {};
  if (status) params.status = status;
  if (targetType) params.targetType = targetType;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  const { data } = await api.get('/admin/reports', { params });
  return data;
}

export async function reviewReport(id, { decision, notes }) {
  const { data } = await api.patch(`/admin/reports/${id}`, { decision, notes });
  return data.report;
}

export async function getReportsSummary() {
  const { data } = await api.get('/admin/reports-summary');
  return data;
}
