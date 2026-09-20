import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageThread',
      required: true,
      index: true,
    },
    fromFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    toFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    // Plain text only for v1 — no markdown, no attachments. 5000 chars
    // is generous for a single conversation turn and keeps the DB row
    // small enough that a thread of ~100 messages fits in a tight page.
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
    // Recipient-side read state. Sender-side is always considered read.
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Newest-first within a thread — the conversation view pages from here.
messageSchema.index({ threadId: 1, createdAt: -1 });

messageSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    threadId: this.threadId.toString(),
    fromFacultyId: this.fromFacultyId.toString(),
    toFacultyId: this.toFacultyId.toString(),
    body: this.body,
    readAt: this.readAt,
    createdAt: this.createdAt,
  };
};

export const Message = mongoose.model('Message', messageSchema);
