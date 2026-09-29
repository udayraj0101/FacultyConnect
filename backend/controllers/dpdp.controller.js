import * as dpdpService from '../services/dpdp.service.js';

export async function exportMyDataHandler(req, res) {
  try {
    const payload = await dpdpService.exportMyData(req.user.id);
    // Nudge the browser to save the response as a JSON file rather than
    // render it inline. Filename embeds the ISO date so repeat exports
    // don't overwrite each other in the Downloads folder.
    const dateSlug = new Date().toISOString().slice(0, 10);
    const emailSlug = (payload.profile?.email || 'faculty')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 40);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="facultyconnect-mydata-${emailSlug}-${dateSlug}.json"`,
    );
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'EXPORT_FAILED', message: error.message },
    });
  }
}

export async function requestErasureHandler(req, res) {
  try {
    const result = await dpdpService.requestErasure(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'ERASURE_FAILED', message: error.message },
    });
  }
}

export async function cancelErasureHandler(req, res) {
  try {
    const result = await dpdpService.cancelErasure(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CANCEL_ERASURE_FAILED', message: error.message },
    });
  }
}
