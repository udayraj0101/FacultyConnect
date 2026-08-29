import * as statsService from '../services/stats.service.js';

export async function platformOverviewHandler(req, res) {
  try {
    const data = await statsService.getPlatformOverview();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'STATS_FAILED', message: error.message },
    });
  }
}

export async function collegeOverviewHandler(req, res) {
  try {
    const data = await statsService.getCollegeAdminOverview(req.user.id);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'STATS_FAILED', message: error.message },
    });
  }
}
