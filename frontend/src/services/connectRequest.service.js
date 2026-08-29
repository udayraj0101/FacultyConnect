import api from './api';

export const PURPOSE_OPTIONS = [
  { value: 'co_author', label: 'Co-author a paper' },
  { value: 'phd_advisory', label: 'PhD advisory / co-supervision' },
  { value: 'joint_fdp', label: 'Host a joint FDP' },
  { value: 'guest_lecture', label: 'Guest lecture invitation' },
  { value: 'grant_collab', label: 'Grant collaboration' },
  { value: 'other', label: 'Other' },
];

export async function sendConnectRequest({ toFacultyId, purpose, message }) {
  const { data } = await api.post('/directory/connect-requests', {
    toFacultyId,
    purpose,
    message,
  });
  return data.request;
}

export async function listConnectRequests({ direction = 'received', status } = {}) {
  const params = { direction };
  if (status) params.status = status;
  const { data } = await api.get('/directory/connect-requests', { params });
  return data;
}

export async function respondToRequest(id, decision) {
  const { data } = await api.patch(`/directory/connect-requests/${id}`, { decision });
  return data.request;
}

export async function getConnectRequestsSummary() {
  const { data } = await api.get('/directory/connect-requests-summary');
  return data;
}

export async function listMyConnections() {
  const { data } = await api.get('/directory/connections');
  return data;
}
