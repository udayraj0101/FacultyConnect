import mongoose from 'mongoose';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];
const STATUSES = ['open', 'closed'];

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
    deadline: this.deadline,
    status: this.status,
    createdAt: this.createdAt,
  };
};

export const Job = mongoose.model('Job', jobSchema);
export { DESIGNATIONS, STATUSES };
