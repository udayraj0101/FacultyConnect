import * as service from '../services/message.service.js';
import { sendMessageSchema, listMessagesQuerySchema } from '../schemas/message.schema.js';

function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
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

export async function sendHandler(req, res) {
  const data = parseBody(sendMessageSchema, req, res);
  if (!data) return;
  try {
    const message = await service.sendMessage({
      fromFacultyId: req.user.id,
      toFacultyId: data.toFacultyId,
      body: data.body,
    });
    return res.status(201).json({ message });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'SEND_FAILED', message: err.message },
    });
  }
}

export async function listThreadsHandler(req, res) {
  try {
    const threads = await service.listMyThreads(req.user.id);
    return res.status(200).json({ threads });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'LIST_FAILED', message: err.message },
    });
  }
}

export async function listMessagesHandler(req, res) {
  const parsed = listMessagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const details = parsed.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details },
    });
  }
  try {
    const result = await service.listMessages({
      facultyId: req.user.id,
      threadId: req.params.id,
      before: parsed.data.before,
      limit: parsed.data.limit,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'LIST_FAILED', message: err.message },
    });
  }
}

export async function markReadHandler(req, res) {
  try {
    const result = await service.markThreadRead({
      facultyId: req.user.id,
      threadId: req.params.id,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'MARK_READ_FAILED', message: err.message },
    });
  }
}

export async function unreadSummaryHandler(req, res) {
  try {
    const result = await service.unreadSummary(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'SUMMARY_FAILED', message: err.message },
    });
  }
}

export async function openThreadHandler(req, res) {
  try {
    const result = await service.openThread({
      facultyId: req.user.id,
      otherFacultyId: req.params.id,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      error: { code: err.code || 'OPEN_THREAD_FAILED', message: err.message },
    });
  }
}
