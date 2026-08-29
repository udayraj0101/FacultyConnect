import { renderFacultyCv } from '../services/cv.service.js';

export async function exportCvHandler(req, res) {
  try {
    const { buffer, filename } = await renderFacultyCv(req.user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CV_EXPORT_FAILED', message: error.message },
    });
  }
}
