import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { generateUniqueHandle } from './publicHandle.service.js';

export async function getById(id) {
  const faculty = await Faculty.findById(id).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return faculty;
}

export async function updateById(id, updates) {
  if (updates.institutionId) {
    const inst = await Institution.findById(updates.institutionId);
    if (!inst) {
      const err = new Error('Institution not found');
      err.code = 'INSTITUTION_NOT_FOUND';
      err.status = 400;
      throw err;
    }
  }
  const faculty = await getById(id);
  Object.assign(faculty, updates);
  await faculty.save();
  return getById(id);
}

export async function setVisibility(id, directoryVisible) {
  const faculty = await getById(id);
  faculty.directoryVisible = directoryVisible;
  await faculty.save();
  return faculty;
}

export async function setPublicProfileEnabled(id, enabled) {
  const faculty = await getById(id);
  faculty.publicProfileEnabled = enabled;
  // Lazily assign a vanity handle the first time public profile is enabled.
  // We never rewrite it afterwards — that would break inbound links.
  if (enabled && !faculty.publicHandle) {
    faculty.publicHandle = await generateUniqueHandle(faculty.name, faculty._id);
  }
  await faculty.save();
  return faculty;
}

export async function linkOrcid(id, orcidId) {
  const conflict = await Faculty.findOne({ orcidId, _id: { $ne: id } });
  if (conflict) {
    const err = new Error('This ORCID iD is already linked to another FacultyConnect account');
    err.code = 'ORCID_ALREADY_LINKED';
    err.status = 409;
    throw err;
  }
  const faculty = await getById(id);
  faculty.orcidId = orcidId;
  await faculty.save();
  return faculty;
}
