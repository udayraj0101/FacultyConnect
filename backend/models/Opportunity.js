import mongoose from 'mongoose';

const TYPES = ['fdp', 'conference', 'grant', 'journal'];
const MODES = ['online', 'offline', 'hybrid'];
const BADGES = ['ugc_care_verified', 'scopus_indexed', 'unverified'];
const STATUSES = ['draft', 'pending_review', 'live', 'delisted'];

const opportunitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    domainTags: { type: [String], default: [], index: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', default: null },
    organizerName: { type: String, required: true, trim: true },
    mode: { type: String, enum: MODES, default: 'offline' },
    location: { type: String, default: null },
    cost: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, required: true, index: true },
    url: { type: String, default: null },
    issn: { type: String, default: null },
    verificationBadge: { type: String, enum: BADGES, default: 'unverified', index: true },
    lastVerifiedAgainstUgcCareOn: { type: Date, default: null },
    status: { type: String, enum: STATUSES, default: 'live', index: true },
  },
  { timestamps: true },
);

opportunitySchema.index({ title: 'text', description: 'text', organizerName: 'text' });

opportunitySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    type: this.type,
    title: this.title,
    description: this.description,
    domainTags: this.domainTags,
    organizerName: this.organizerName,
    mode: this.mode,
    location: this.location,
    cost: this.cost,
    deadline: this.deadline,
    url: this.url,
    issn: this.issn,
    verificationBadge: this.verificationBadge,
    lastVerifiedAgainstUgcCareOn: this.lastVerifiedAgainstUgcCareOn,
  };
};

export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export { TYPES, MODES, BADGES, STATUSES };
