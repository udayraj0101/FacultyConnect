import * as directoryService from '../services/directory.service.js';
import { searchDirectoryQuerySchema } from '../schemas/directory.schema.js';

export async function searchHandler(req, res) {
  const parsed = searchDirectoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await directoryService.search(parsed.data, req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SEARCH_FAILED', message: error.message },
    });
  }
}

export async function profileHandler(req, res) {
  try {
    const result = await directoryService.getDirectoryProfile(req.params.id, req.user.id);
    return res.status(200).json({ profile: result });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'PROFILE_FAILED', message: error.message },
    });
  }
}
