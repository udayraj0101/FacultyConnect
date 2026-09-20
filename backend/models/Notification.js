import mongoose from 'mongoose';

const TYPES = [
  'connect_request_received',
  'connect_request_accepted',
  'connect_request_declined',
  'application_status_changed',
  'faculty_approved',
  'faculty_rejected',
  'invitation_accepted',
  'saved_search_matches',
];

const notificationSchema = new mongoose.Schema(
  {
    // Recipient — the faculty who sees this in their inbox.
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    type: { type: String, enum: TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, default: '', maxlength: 500 },
    // Optional deep link inside the SPA (e.g. `/requests`, `/jobs/{id}`).
    link: { type: String, trim: true, default: null, maxlength: 300 },
    // readAt is null while unread; timestamp is set when the user marks
    // it read (either individually or via mark-all-read).
    readAt: { type: Date, default: null, index: true },
    // Free-form context useful for building deep links or rendering
    // richer cards later — keeps the model flexible without a migration.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Compound index for the primary query: unread notifications for a
// given user, newest first.
notificationSchema.index({ facultyId: 1, readAt: 1, createdAt: -1 });

notificationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    type: this.type,
    title: this.title,
    body: this.body || '',
    link: this.link || null,
    read: Boolean(this.readAt),
    readAt: this.readAt,
    createdAt: this.createdAt,
    metadata: this.metadata || {},
  };
};

export const Notification = mongoose.model('Notification', notificationSchema);
export { TYPES as NOTIFICATION_TYPES };
