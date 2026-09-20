import * as casService from '../services/cas.service.js';

export async function getCasScoreHandler(req, res) {
  try {
    const result = await casService.computeResearchScore(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CAS_COMPUTE_FAILED', message: error.message },
    });
  }
}

export async function updateCasManualInputsHandler(req, res) {
  try {
    const result = await casService.updateManualInputs(req.user.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CAS_UPDATE_FAILED', message: error.message },
    });
  }
}
