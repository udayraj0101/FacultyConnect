import mongoose from 'mongoose';
import { Message } from '../models/Message.js';
import { MessageThread } from '../models/MessageThread.js';
import { ConnectRequest } from '../models/ConnectRequest.js';
import { Faculty } from '../models/Faculty.js';
import { notify } from './notification.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('message');

/**
 * Precondition for messaging: the pair must have an accepted
 * ConnectRequest between them. Direction doesn't matter — either
 * party can initiate the conversation once the request is accepted.
 * Throws a 403 if there's no accepted link, so the frontend never
 * has to decide whether to hide the compose UI on its own.
 */
async function assertAcceptedConnection(a, b) {
  const link = await ConnectRequest.findOne({
    status: 'accepted',
    $or: [
      { fromFacultyId: a, toFacultyId: b },
      { fromFacultyId: b, toFacultyId: a },
    ],
  }).select('_id');
  if (!link) {
    const err = new Error(
      'You can only message a faculty member after a connect request between you has been accepted.',
    );
    err.code = 'CONNECT_NOT_ACCEPTED';
    err.status = 403;
    throw err;
  }
}

async function findOrCreateThread(a, b) {
  const [p1, p2] = MessageThread.pairKey(a, b);
  const existing = await MessageThread.findOne({
    participants: { $all: [p1, p2] },
    'participants.1': { $exists: true },
  });
  if (existing) return existing;
  try {
    return await MessageThread.create({
      participants: [p1, p2],
      lastMessageAt: null,
      unreadByFacultyId: { [p1]: 0, [p2]: 0 },
    });
  } catch (err) {
    // Race with another concurrent send — fall through to a fresh read.
    if (err.code === 11000) {
      return MessageThread.findOne({
        participants: { $all: [p1, p2] },
        'participants.1': { $exists: true },
      });
    }
    throw err;
  }
}

export async function sendMessage({ fromFacultyId, toFacultyId, body }) {
  if (fromFacultyId === toFacultyId || String(fromFacultyId) === String(toFacultyId)) {
    const err = new Error('You cannot message yourself.');
    err.code = 'SELF_MESSAGE';
    err.status = 400;
    throw err;
  }
  await assertAcceptedConnection(fromFacultyId, toFacultyId);
  const recipient = await Faculty.findById(toFacultyId).select('_id name email');
  if (!recipient) {
    const err = new Error('Recipient not found');
    err.code = 'RECIPIENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const thread = await findOrCreateThread(fromFacultyId, toFacultyId);
  const msg = await Message.create({
    threadId: thread._id,
    fromFacultyId,
    toFacultyId,
    body,
  });
  // Update thread rollup + recipient unread counter atomically. Use the
  // Mixed field on the model — direct nested key updates are safe for
  // Mixed since we never rely on Mongoose change tracking for it.
  const preview = body.length > 200 ? `${body.slice(0, 197)}…` : body;
  const unreadKey = `unreadByFacultyId.${toFacultyId.toString?.() || toFacultyId}`;
  await MessageThread.updateOne(
    { _id: thread._id },
    {
      $set: {
        lastMessageAt: msg.createdAt,
        lastMessageFromId: fromFacultyId,
        lastMessageBody: preview,
      },
      $inc: { [unreadKey]: 1 },
    },
  );
  logger.info('message sent', {
    threadId: thread._id.toString(),
    from: String(fromFacultyId),
    to: String(toFacultyId),
    length: body.length,
  });

  // Fire-and-forget cross-channel notification. Uses the Wave 1 notify()
  // facade so in-app + email travel in one call. Email is a preview only
  // — full body stays on-platform where the sender can edit / delete
  // later without stale copies in inboxes.
  const senderDoc = await Faculty.findById(fromFacultyId).select('name');
  notify(recipient, 'message_received', {
    fromName: senderDoc?.name || 'A collaborator',
    threadId: thread._id.toString(),
    preview,
  }).catch(err => logger.warn('message_received notify failed', { error: err.message }));

  return msg.toPublicJSON();
}

/**
 * Threads for the viewer, most-recently-active first. Includes the
 * other participant's public directory summary so the list view can
 * render "who / preview / unread" without a second round-trip.
 */
export async function listMyThreads(facultyId) {
  const threads = await MessageThread.find({ participants: facultyId })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name designation department institutionId');
  const viewerStr = facultyId.toString();
  return threads
    // A thread only makes sense once someone has actually sent something.
    // Empty rows can exist briefly if a client polled findOrCreate for
    // some other reason — filter them out of the listing.
    .filter(t => t.lastMessageAt)
    .map(t => {
      const other = t.participants.find(p => p._id.toString() !== viewerStr);
      return {
        ...t.toPublicJSON(facultyId),
        other: other
          ? {
              id: other._id.toString(),
              name: other.name,
              designation: other.designation,
              department: other.department || '',
            }
          : null,
      };
    });
}

/**
 * Messages in a thread the viewer participates in. Backward paginated
 * with a `before` timestamp — the conversation view renders oldest
 * first at the top, freshest at the bottom.
 */
export async function listMessages({ facultyId, threadId, before, limit }) {
  const thread = await MessageThread.findOne({
    _id: threadId,
    participants: facultyId,
  }).populate('participants', 'name designation department institutionId');
  if (!thread) {
    const err = new Error('Thread not found');
    err.code = 'THREAD_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const query = { threadId };
  if (before) query.createdAt = { $lt: before };
  const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(limit);
  // Resolve the "other" participant here so the client can render the
  // conversation header the moment it opens a thread by URL, even before
  // the thread has appeared in listMyThreads (which filters out empty
  // threads to avoid noise for the recipient).
  const viewerStr = facultyId.toString();
  const other = (thread.participants || []).find(
    p => p._id.toString() !== viewerStr,
  );
  return {
    messages: msgs.reverse().map(m => m.toPublicJSON()),
    thread: thread.toPublicJSON(facultyId),
    other: other
      ? {
          id: other._id.toString(),
          name: other.name,
          designation: other.designation,
          department: other.department || '',
        }
      : null,
  };
}

/**
 * Mark all messages in the thread as read for the viewer. Zeroes the
 * unread counter on the thread rollup so the sidebar badge drops the
 * moment the user opens the conversation.
 */
export async function markThreadRead({ facultyId, threadId }) {
  const thread = await MessageThread.findOne({
    _id: threadId,
    participants: facultyId,
  });
  if (!thread) {
    const err = new Error('Thread not found');
    err.code = 'THREAD_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const now = new Date();
  await Message.updateMany(
    { threadId, toFacultyId: facultyId, readAt: null },
    { $set: { readAt: now } },
  );
  const unreadKey = `unreadByFacultyId.${facultyId.toString?.() || facultyId}`;
  await MessageThread.updateOne(
    { _id: threadId },
    { $set: { [unreadKey]: 0 } },
  );
  return { threadId: threadId.toString(), markedAt: now };
}

/**
 * Total unread messages across all my threads. Cheap enough to poll
 * from the header bell / nav badge every minute or so.
 */
export async function unreadSummary(facultyId) {
  const threads = await MessageThread.find({
    participants: facultyId,
    lastMessageAt: { $ne: null },
  }).select('unreadByFacultyId');
  const viewerStr = facultyId.toString();
  let total = 0;
  let threadsWithUnread = 0;
  for (const t of threads) {
    const n = Number(t.unreadByFacultyId?.[viewerStr] || 0);
    if (n > 0) {
      total += n;
      threadsWithUnread += 1;
    }
  }
  return { total, threadsWithUnread };
}

/**
 * Compose-time helper: given a target, return whether messaging is
 * allowed and, if so, the thread id (creating it lazily so the
 * conversation URL is stable). Called by the "Message" CTA on
 * DirectoryProfile / Requests / etc.
 */
export async function openThread({ facultyId, otherFacultyId }) {
  if (String(facultyId) === String(otherFacultyId)) {
    const err = new Error('You cannot message yourself.');
    err.code = 'SELF_MESSAGE';
    err.status = 400;
    throw err;
  }
  await assertAcceptedConnection(facultyId, otherFacultyId);
  const thread = await findOrCreateThread(facultyId, otherFacultyId);
  return { threadId: thread._id.toString() };
}

// Prevent the `mongoose` import above from being flagged as unused
// during dead-code sweeps — it participates via the transitive schema
// types but nothing here references it by name.
void mongoose;
