import api from './api';

export async function listNotifications({ unreadOnly = false, limit } = {}) {
  const params = {};
  if (unreadOnly) params.unread = 'true';
  if (limit) params.limit = limit;
  const { data } = await api.get('/notifications', { params });
  return data.notifications || [];
}

export async function getNotificationsSummary() {
  const { data } = await api.get('/notifications/summary');
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.notification;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post('/notifications/mark-all-read');
  return data;
}
