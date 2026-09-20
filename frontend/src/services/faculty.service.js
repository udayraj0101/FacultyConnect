import api from './api';

export async function getMe() {
  const { data } = await api.get('/faculty/me');
  return data.faculty;
}

export async function updateMe(patch) {
  const { data } = await api.patch('/faculty/me', patch);
  return data.faculty;
}

export async function setDirectoryVisibility(directoryVisible) {
  const { data } = await api.patch('/faculty/me/visibility', { directoryVisible });
  return data.faculty;
}

export async function setPublicProfileEnabled(publicProfileEnabled) {
  const { data } = await api.patch('/faculty/me/public-profile', { publicProfileEnabled });
  return data.faculty;
}

export async function getPublicProfile(id) {
  const { data } = await api.get(`/public/faculty/${id}`);
  return data.profile;
}

export async function getOrcidAuthorizeUrl() {
  const { data } = await api.get('/auth/orcid/redirect');
  return data.authorizeUrl;
}

export async function downloadCv(template) {
  const params = template ? { template } : undefined;
  const response = await api.get('/faculty/me/cv/export', {
    responseType: 'blob',
    params,
  });
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : 'cv.pdf';
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function addPublication(payload) {
  const { data } = await api.post('/faculty/me/publications', payload);
  return data.publication;
}

export async function deletePublication(id) {
  const { data } = await api.delete(`/faculty/me/publications/${id}`);
  return data;
}
