import * as service from '../services/savedSearch.service.js';
import {
  createSavedSearchSchema,
  updateSavedSearchSchema,
} from '../schemas/savedSearch.schema.js';

function parse(schema, body, res) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
    return null;
  }
  return result.data;
}

export async function createHandler(req, res) {
  const data = parse(createSavedSearchSchema, req.body, res);
  if (!data) return;
  try {
    const saved = await service.createSavedSearch(req.user.id, data);
    return res.status(201).json({ savedSearch: saved });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'CREATE_FAILED', message: err.message },
    });
  }
}

export async function listHandler(req, res) {
  try {
    const savedSearches = await service.listMine(req.user.id);
    return res.status(200).json({ savedSearches });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'LIST_FAILED', message: err.message },
    });
  }
}

export async function updateHandler(req, res) {
  const data = parse(updateSavedSearchSchema, req.body, res);
  if (!data) return;
  try {
    const saved = await service.updateMine(req.user.id, req.params.id, data);
    return res.status(200).json({ savedSearch: saved });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'UPDATE_FAILED', message: err.message },
    });
  }
}

export async function deleteHandler(req, res) {
  try {
    const out = await service.deleteMine(req.user.id, req.params.id);
    return res.status(200).json(out);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'DELETE_FAILED', message: err.message },
    });
  }
}

export async function runHandler(req, res) {
  try {
    const result = await service.runSavedSearch(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'RUN_FAILED', message: err.message },
    });
  }
}
