import * as facultyService from '../services/faculty.service.js';

export async function getMeHandler(req, res) {
  try {
    const faculty = await facultyService.getById(req.user.id);
    return res.status(200).json({ faculty: faculty.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'FETCH_FAILED', message: error.message },
    });
  }
}

export async function updateMeHandler(req, res) {
  try {
    const faculty = await facultyService.updateById(req.user.id, req.body);
    return res.status(200).json({ faculty: faculty.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'UPDATE_FAILED', message: error.message },
    });
  }
}

export async function setVisibilityHandler(req, res) {
  try {
    const faculty = await facultyService.setVisibility(req.user.id, req.body.directoryVisible);
    return res.status(200).json({ faculty: faculty.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'UPDATE_FAILED', message: error.message },
    });
  }
}

export async function setPublicProfileHandler(req, res) {
  try {
    const faculty = await facultyService.setPublicProfileEnabled(
      req.user.id,
      req.body.publicProfileEnabled,
    );
    return res.status(200).json({ faculty: faculty.toPublicJSON() });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'UPDATE_FAILED', message: error.message },
    });
  }
}
