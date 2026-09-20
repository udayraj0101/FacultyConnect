import { renderFacultyCv, renderUgcCasCv } from '../services/cv.service.js';

// Two CV templates today. `template=ugc_cas9` renders the standardised
// UGC 2018 promotion proforma; anything else falls back to the generic
// branded CV (Wave 1 default). Extend by adding cases here rather than
// forking the route — keeps the URL surface stable.
const TEMPLATES = {
  ugc_cas9: renderUgcCasCv,
  generic: renderFacultyCv,
};

export async function exportCvHandler(req, res) {
  try {
    const requested = String(req.query.template || 'generic').toLowerCase();
    const renderer = TEMPLATES[requested] || TEMPLATES.generic;
    const { buffer, filename } = await renderer(req.user.id);
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
