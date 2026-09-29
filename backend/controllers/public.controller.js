import * as publicService from '../services/public.service.js';

export async function publicProfileHandler(req, res) {
  try {
    const profile = await publicService.getPublicProfile(req.params.id);
    // Short cache — public content that's OK to cache at the CDN edge
    // but should refresh reasonably fast when the faculty edits.
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ profile });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'PROFILE_FAILED', message: error.message },
    });
  }
}

export async function publicInstitutionHandler(req, res) {
  try {
    const institution = await publicService.getPublicInstitution(req.params.id);
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ institution });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'INSTITUTION_FAILED', message: error.message },
    });
  }
}
