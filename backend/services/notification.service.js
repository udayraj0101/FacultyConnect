import { Notification } from '../models/Notification.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('notification');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Create a notification. Always returns a promise; failures are logged
 * but do NOT propagate — notifications are ancillary and should never
 * break the primary action that triggered them (e.g. don't fail an
 * "approve faculty" call just because notification save failed).
 */
export async function emit({ facultyId, type, title, body = '', link = null, metadata = {} }) {
  try {
    const doc = await Notification.create({
      facultyId,
      type,
      title,
      body,
      link,
      metadata,
    });
    logger.info('notification emitted', {
      id: doc._id.toString(),
      facultyId: facultyId.toString(),
      type,
    });
    return doc;
  } catch (err) {
    logger.error('notification emit failed', {
      error: err.message,
      facultyId: facultyId?.toString(),
      type,
    });
    return null;
  }
}

/**
 * List notifications for a faculty. `unreadOnly` narrows to unread;
 * `limit` caps at 50. Sorted newest first.
 */
export async function listForFaculty(facultyId, { unreadOnly = false, limit = DEFAULT_LIMIT } = {}) {
  const query = { facultyId };
  if (unreadOnly) query.readAt = null;
  const cappedLimit = Math.min(limit, MAX_LIMIT);
  const docs = await Notification.find(query).sort({ createdAt: -1 }).limit(cappedLimit);
  return docs.map(d => d.toPublicJSON());
}

/**
 * Summary for the header bell — just the counts. Cheap enough to poll.
 */
export async function summary(facultyId) {
  const [unread, total] = await Promise.all([
    Notification.countDocuments({ facultyId, readAt: null }),
    Notification.countDocuments({ facultyId }),
  ]);
  return { unread, total };
}

export async function markRead(facultyId, notificationId) {
  const doc = await Notification.findOne({ _id: notificationId, facultyId });
  if (!doc) {
    const err = new Error('Notification not found');
    err.code = 'NOTIFICATION_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (!doc.readAt) {
    doc.readAt = new Date();
    await doc.save();
  }
  return doc.toPublicJSON();
}

export async function markAllRead(facultyId) {
  const result = await Notification.updateMany(
    { facultyId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { updated: result.modifiedCount || 0 };
}
