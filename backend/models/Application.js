import mongoose from 'mongoose';

const STATUSES = ['applied', 'shortlisted', 'interview', 'closed'];

// Per-reviewer scorecard. Committee shortlisting typically involves 2-4
// reviewers each scoring on a 1-5 scale; we keep it as an array of
// sub-documents (rather than a flat rating field) so multiple admins
// can review the same applicant and their scores aren't overwritten.
// A reviewer editing their own scorecard is an upsert on reviewerId —
// they can only touch their own row.
const scorecardSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    reviewerName: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null, maxlength: 2000 },
  },
  { timestamps: true, _id: true },
);

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    status: { type: String, enum: STATUSES, default: 'applied', index: true },
    appliedAt: { type: Date, default: Date.now },
    notes: { type: String, default: null },
    scorecards: { type: [scorecardSchema], default: [] },
  },
  { timestamps: true },
);

// One application per (job, faculty) pair.
applicationSchema.index({ jobId: 1, facultyId: 1 }, { unique: true });

applicationSchema.methods.toPublicJSON = function toPublicJSON() {
  const fac = this.facultyId;
  const populatedFac =
    fac && typeof fac === 'object' && fac._id
      ? {
          id: fac._id.toString(),
          name: fac.name,
          email: fac.email,
          designation: fac.designation,
          orcidId: fac.orcidId,
          domainTags: fac.domainTags,
          citationCount: fac.citationCount,
          hIndex: fac.hIndex,
        }
      : null;
  const scorecards = (this.scorecards || []).map(sc => ({
    id: sc._id?.toString?.() || null,
    reviewerId: sc.reviewerId?.toString?.() || null,
    reviewerName: sc.reviewerName || '',
    rating: sc.rating,
    comment: sc.comment || '',
    updatedAt: sc.updatedAt,
  }));
  const ratingCount = scorecards.length;
  const averageRating =
    ratingCount > 0 ? scorecards.reduce((s, r) => s + r.rating, 0) / ratingCount : null;
  return {
    id: this._id.toString(),
    jobId: this.jobId?.toString?.() || null,
    faculty: populatedFac,
    facultyId: populatedFac ? populatedFac.id : fac?.toString?.() || null,
    status: this.status,
    appliedAt: this.appliedAt,
    notes: this.notes,
    scorecards,
    ratingCount,
    // Round to one decimal so the UI can show "3.7 / 5" without JS
    // float noise. Callers that need the raw value can recompute.
    averageRating: averageRating != null ? Math.round(averageRating * 10) / 10 : null,
  };
};

export const Application = mongoose.model('Application', applicationSchema);
export { STATUSES };
