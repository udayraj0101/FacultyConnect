import mongoose from 'mongoose';

const STATUSES = ['applied', 'shortlisted', 'interview', 'closed'];

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
  return {
    id: this._id.toString(),
    jobId: this.jobId?.toString?.() || null,
    faculty: populatedFac,
    facultyId: populatedFac ? populatedFac.id : fac?.toString?.() || null,
    status: this.status,
    appliedAt: this.appliedAt,
    notes: this.notes,
  };
};

export const Application = mongoose.model('Application', applicationSchema);
export { STATUSES };
