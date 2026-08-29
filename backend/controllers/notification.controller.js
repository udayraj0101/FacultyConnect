import * as notificationService from '../services/notification.service.js';

export async function listHandler(req, res) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const notifications = await notificationService.listForFaculty(req.user.id, {
      unreadOnly,
      limit,
    });
    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function summaryHandler(req, res) {
  try {
    const result = await notificationService.summary(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'SUMMARY_FAILED', message: error.message },
    });
  }
}

export async function markReadHandler(req, res) {
  try {
    const notification = await notificationService.markRead(req.user.id, req.params.id);
    return res.status(200).json({ notification });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'MARK_READ_FAILED', message: error.message },
    });
  }
}

export async function markAllReadHandler(req, res) {
  try {
    const result = await notificationService.markAllRead(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'MARK_ALL_READ_FAILED', message: error.message },
    });
  }
}
