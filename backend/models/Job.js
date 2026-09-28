import mongoose from 'mongoose';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];
// `archived` is a soft-delete tri-state: postings the admin removed but
// that we keep for audit + past-application referencing. Public list
// routes exclude archived by default; the "My postings" console can
// opt in with an include_archived flag.
const STATUSES = ['open', 'closed', 'archived'];

const jobSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, enum: DESIGNATIONS, required: true },
    qualifications: { type: String, required: true },
    description: { type: String, required: true },
    domainTags: { type: [String], default: [], index: true },
    location: { type: String, default: null, trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    salaryDisclosed: { type: String, default: null, trim: true },
    // Total seats advertised on this posting. Kept as an integer so we can
    // do arithmetic against the reservation breakup below. Defaults to 1
    // for backward compat with jobs created before this field existed.
    vacancies: { type: Number, default: 1, min: 1, max: 500 },
    // Government-institution reservation roster (Central Govt / UGC
    // standard: UR, SC, ST, OBC, EWS as vertical + PwD as horizontal).
    // All default to 0 so private institutions can leave the whole block
    // empty. Validated at the API layer: vertical sum (UR+SC+ST+OBC+EWS)
    // must equal `vacancies` if any category is set. PwD is horizontal —
    // it carves seats out of the above, so it caps at `vacancies` not the
    // total of the other categories.
    reservation: {
      UR: { type: Number, default: 0, min: 0, max: 500 },
      SC: { type: Number, default: 0, min: 0, max: 500 },
      ST: { type: Number, default: 0, min: 0, max: 500 },
      OBC: { type: Number, default: 0, min: 0, max: 500 },
      EWS: { type: Number, default: 0, min: 0, max: 500 },
      PwD: { type: Number, default: 0, min: 0, max: 500 },
    },
    deadline: { type: Date, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'open', index: true },
  },
  { timestamps: true },
);

jobSchema.index({ title: 'text', description: 'text', qualifications: 'text' });

jobSchema.methods.toPublicJSON = function toPublicJSON() {
  const inst = this.institutionId;
  const populatedInst =
    inst && typeof inst === 'object' && inst._id
      ? {
          id: inst._id.toString(),
          name: inst.name,
          domain: inst.domain,
          verificationStatus: inst.verificationStatus,
        }
      : null;
  return {
    id: this._id.toString(),
    institutionId: populatedInst ? populatedInst.id : inst?.toString?.() || null,
    institution: populatedInst,
    title: this.title,
    department: this.department,
    designation: this.designation,
    qualifications: this.qualifications,
    description: this.description,
    domainTags: this.domainTags,
    location: this.location,
    experienceYears: this.experienceYears,
    salaryDisclosed: this.salaryDisclosed,
    vacancies: this.vacancies || 1,
    reservation: {
      UR: this.reservation?.UR || 0,
      SC: this.reservation?.SC || 0,
      ST: this.reservation?.ST || 0,
      OBC: this.reservation?.OBC || 0,
      EWS: this.reservation?.EWS || 0,
      PwD: this.reservation?.PwD || 0,
    },
    deadline: this.deadline,
    status: this.status,
    createdAt: this.createdAt,
  };
};

export const Job = mongoose.model('Job', jobSchema);
export { DESIGNATIONS, STATUSES };
