import mongoose from 'mongoose';

// A message thread is the conversation between exactly two faculty who
// have an accepted ConnectRequest between them. The participants array
// is normalised to always be sorted by ObjectId, so a { A, B } pair
// resolves to the same thread whether A or B initiates lookup.
//
// Denormalised lastMessage* fields exist so the /messages list view can
// render "who / when / preview" without joining the Message collection
// per row. The message service is the sole writer.
const messageThreadSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Faculty',
          required: true,
        },
      ],
      validate: {
        validator: v => Array.isArray(v) && v.length === 2,
        message: 'A thread must have exactly two participants.',
      },
    },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessageFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      default: null,
    },
    lastMessageBody: { type: String, default: '', maxlength: 200 },
    // Per-participant unread counter — cheaper than counting Message docs
    // on every render. Keys are stringified ObjectIds so Mixed-typed maps
    // round-trip cleanly through JSON.
    unreadByFacultyId: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Unique constraint on the sorted-participants pair prevents duplicate
// thread creation under a race. Partial filter avoids indexing threads
// that somehow ended up with != 2 participants (defensive).
messageThreadSchema.index(
  { participants: 1 },
  { unique: true, partialFilterExpression: { 'participants.1': { $exists: true } } },
);

// Fast query for "my threads, newest activity first".
messageThreadSchema.index({ participants: 1, lastMessageAt: -1 });

messageThreadSchema.statics.pairKey = function pairKey(a, b) {
  // Sort the two ids by string so a request from either direction
  // resolves to the same document.
  const s1 = a.toString();
  const s2 = b.toString();
  return s1 < s2 ? [s1, s2] : [s2, s1];
};

messageThreadSchema.methods.toPublicJSON = function toPublicJSON(viewerId) {
  const viewerStr = viewerId?.toString?.() || String(viewerId);
  const unread = (this.unreadByFacultyId?.[viewerStr] || 0);
  return {
    id: this._id.toString(),
    participants: (this.participants || []).map(p =>
      typeof p === 'object' && p._id ? p._id.toString() : p.toString(),
    ),
    lastMessageAt: this.lastMessageAt,
    lastMessageFromId: this.lastMessageFromId?.toString?.() || null,
    lastMessageBody: this.lastMessageBody || '',
    unread,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const MessageThread = mongoose.model('MessageThread', messageThreadSchema);
