import * as service from '../services/connect-request.service.js';
import {
  createConnectRequestSchema,
  listConnectRequestsQuerySchema,
  respondConnectRequestSchema,
} from '../schemas/connect-request.schema.js';

export async function createHandler(req, res) {
  const parsed = createConnectRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const request = await service.create({
      fromFacultyId: req.user.id,
      ...parsed.data,
    });
    return res.status(201).json({ request });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'CREATE_FAILED', message: error.message },
    });
  }
}

export async function listHandler(req, res) {
  const parsed = listConnectRequestsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await service.list({ viewerId: req.user.id, ...parsed.data });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function respondHandler(req, res) {
  const parsed = respondConnectRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details },
    });
  }
  try {
    const request = await service.respond({
      requestId: req.params.id,
      viewerId: req.user.id,
      decision: parsed.data.decision,
    });
    return res.status(200).json({ request });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'RESPOND_FAILED', message: error.message },
    });
  }
}

export async function networkHandler(req, res) {
  try {
    const result = await service.myNetwork(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'NETWORK_FAILED', message: error.message },
    });
  }
}

export async function summaryHandler(req, res) {
  try {
    const pendingReceived = await service.pendingReceivedCount(req.user.id);
    return res.status(200).json({ pendingReceived });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SUMMARY_FAILED', message: error.message },
    });
  }
}
