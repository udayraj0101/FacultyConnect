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

// IT Rules 2021, Rule 3(2)(a): grievances must be ACKNOWLEDGED within
// 24 hours and RESOLVED within 15 days. We stamp both deadlines at
// report creation so the admin console can show two independent timers
// and auto-flag SLA breaches for audit.
//
// History: this constant was 72 hours before Oct 2026. QA report
// flagged the mismatch with the statute; bumped to the lower 24h
// bound. Don't widen without a legal review.
const ACK_SLA_HOURS = 24;
const RESOLUTION_SLA_DAYS = 15;

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
    // slaDeadline retained as the ACK deadline for schema compatibility —
    // existing rows + admin console copy already read this field. The
    // new resolutionDeadline is additive.
    slaDeadline: { type: Date, required: true, index: true },
    // Nullable on the schema so legacy rows (pre Oct 2026 patch) still
    // load — `resolutionOverdue` just stays false for them. New rows
    // are always populated by report.service.js on create.
    resolutionDeadline: { type: Date, default: null, index: true },
    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
    reviewNotes: { type: String, default: null },
  },
  { timestamps: true },
);

reportSchema.statics.slaDeadlineFromNow = function slaDeadlineFromNow() {
  return new Date(Date.now() + ACK_SLA_HOURS * 60 * 60 * 1000);
};

reportSchema.statics.resolutionDeadlineFromNow = function resolutionDeadlineFromNow() {
  return new Date(Date.now() + RESOLUTION_SLA_DAYS * 24 * 60 * 60 * 1000);
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
    // Two SLAs per IT Rules 2021 Rule 3(2)(a): 24h acknowledgment +
    // 15-day resolution. slaDeadline = ACK deadline (name kept for
    // backward compat with existing admin console copy); overdue flag
    // only fires when status is still 'open' (acknowledgment is the
    // transition from open → acknowledged).
    slaDeadline: this.slaDeadline,
    slaOverdue: this.slaDeadline && this.slaDeadline < new Date() && this.status === 'open',
    resolutionDeadline: this.resolutionDeadline,
    resolutionOverdue:
      this.resolutionDeadline &&
      this.resolutionDeadline < new Date() &&
      !['resolved', 'dismissed'].includes(this.status),
    acknowledgedAt: this.acknowledgedAt,
    resolvedAt: this.resolvedAt,
    reviewedBy: reviewerPopulated,
    reviewNotes: this.reviewNotes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Report = mongoose.model('Report', reportSchema);
export { TARGET_TYPES, STATUSES, CATEGORIES, ACK_SLA_HOURS, RESOLUTION_SLA_DAYS };
