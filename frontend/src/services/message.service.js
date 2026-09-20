import api from './api';

export async function listMyThreads() {
  const { data } = await api.get('/messages/threads');
  return data.threads || [];
}

export async function listMessages(threadId, params = {}) {
  const { data } = await api.get(`/messages/threads/${threadId}`, { params });
  return data;
}

export async function sendMessage({ toFacultyId, body }) {
  const { data } = await api.post('/messages', { toFacultyId, body });
  return data.message;
}

export async function markThreadRead(threadId) {
  const { data } = await api.patch(`/messages/threads/${threadId}/read`);
  return data;
}

export async function unreadSummary() {
  const { data } = await api.get('/messages/unread-summary');
  return data;
}

export async function openThreadWith(otherFacultyId) {
  const { data } = await api.get(`/messages/with/${otherFacultyId}`);
  return data.threadId;
}
