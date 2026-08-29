import mongoose from 'mongoose';

const TARGET_TYPES = ['opportunity', 'job', 'faculty'];
const STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'];
const CATEGORIES = [
  'predatory_journal',
  'fake_job',
  'fraudulent_organizer',
  'harassment',
  'spam',
  'other',
];

export const CATEGORY_LABELS = {
  predatory_journal: 'Predatory journal',
  fake_job: 'Fake job posting',
  fraudulent_organizer: 'Fraudulent organizer',
  harassment: 'Harassment / abuse',
  spam: 'Spam',
  other: 'Other',
};

// Per IT Rules 2021 (PRD §3.6, §8): grievance acknowledgment SLA 24–72 hr.
// We use 72h as the operational deadline; UI highlights entries running out.
const SLA_HOURS = 72;

const reportSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: TARGET_TYPES, required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    // Denormalized snapshot at report time — survives target deletion so the
    // audit trail is meaningful even after moderation actions.
    targetSnapshot: {
      title: String,
      subtitle: String,
      extra: mongoose.Schema.Types.Mixed,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    category: { type: String, enum: CATEGORIES, required: true },
    reason: { type: String, required: true, minlength: 10, maxlength: 1000 },
    status: { type: String, enum: STATUSES, default: 'open', index: true },
    slaDeadline: { type: Date, required: true, index: true },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
    reviewNotes: { type: String, default: null },
  },
  { timestamps: true },
);

reportSchema.statics.slaDeadlineFromNow = function slaDeadlineFromNow() {
  return new Date(Date.now() + SLA_HOURS * 60 * 60 * 1000);
};

reportSchema.methods.toPublicJSON = function toPublicJSON() {
  const reporter = this.reporterId;
  const reporterPopulated =
    reporter && typeof reporter === 'object' && reporter._id
      ? { id: reporter._id.toString(), name: reporter.name, email: reporter.email }
      : null;
  const reviewer = this.reviewedBy;
  const reviewerPopulated =
    reviewer && typeof reviewer === 'object' && reviewer._id
      ? { id: reviewer._id.toString(), name: reviewer.name }
      : null;
  return {
    id: this._id.toString(),
    targetType: this.targetType,
    targetId: this.targetId?.toString?.() || null,
    targetSnapshot: this.targetSnapshot,
    reporter: reporterPopulated,
    category: this.category,
    categoryLabel: CATEGORY_LABELS[this.category] || this.category,
    reason: this.reason,
    status: this.status,
    slaDeadline: this.slaDeadline,
    slaOverdue: this.slaDeadline && this.slaDeadline < new Date() && this.status === 'open',
    acknowledgedAt: this.acknowledgedAt,
    resolvedAt: this.resolvedAt,
    reviewedBy: reviewerPopulated,
    reviewNotes: this.reviewNotes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Report = mongoose.model('Report', reportSchema);
export { TARGET_TYPES, STATUSES, CATEGORIES, SLA_HOURS };
