import mongoose from 'mongoose';

const TYPES = ['fdp', 'conference', 'grant', 'journal'];
const MODES = ['online', 'offline', 'hybrid'];
const BADGES = ['ugc_care_verified', 'scopus_indexed', 'unverified'];
const STATUSES = ['draft', 'pending_review', 'live', 'delisted'];

// Independent indexers a journal appears in. Multi-select — a journal
// can (and usually does) sit in more than one at once. Distinct from
// verificationBadge which conflated indexing with editorial trust.
// Journal Discover filters by any-match against this array.
const INDEXING = [
  'scopus',
  'wos_scie',
  'wos_ssci',
  'wos_esci',
  'ugc_care_i',
  'ugc_care_ii',
  'doaj',
  'pubmed',
];

// Open Access publishing model. Gold = author pays APC, article is OA.
// Green = self-archive preprint. Diamond = free for author AND reader.
// Hybrid = subscription journal with optional per-article OA.
const OA_TYPES = ['gold', 'green', 'diamond', 'hybrid', 'none'];

const apcSchema = new mongoose.Schema(
  {
    amount: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'INR', trim: true, maxlength: 8 },
    waiverAvailable: { type: Boolean, default: false },
    oaType: { type: String, enum: OA_TYPES, default: 'none' },
  },
  { _id: false },
);

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
    // Legacy single-label editorial trust. Kept as-is for backward compat
    // with existing filters and admin verification workflow. New journal
    // Discover UI reads `indexing[]` and `predatoryScreened` in preference.
    verificationBadge: { type: String, enum: BADGES, default: 'unverified', index: true },
    // Multi-indexer membership. Journal-type opportunities primarily use
    // this; FDPs/conferences/grants ignore it. Any-match filter on the
    // list endpoint.
    indexing: { type: [{ type: String, enum: INDEXING }], default: [], index: true },
    // Explicit "not-predatory" trust marker surfaced on the journal card.
    // True means a human or an automated Beall/Retraction Watch screen
    // vouched. False is the safe default — cards render an unmarked
    // journal without the green shield rather than falsely claiming
    // predator-free.
    predatoryScreened: { type: Boolean, default: false, index: true },
    // Journal-type only: what the author pays and under what OA model.
    apc: { type: apcSchema, default: () => ({ oaType: 'none', waiverAvailable: false }) },
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
    indexing: this.indexing || [],
    predatoryScreened: Boolean(this.predatoryScreened),
    apc: this.apc
      ? {
          amount: this.apc.amount ?? null,
          currency: this.apc.currency || 'INR',
          waiverAvailable: Boolean(this.apc.waiverAvailable),
          oaType: this.apc.oaType || 'none',
        }
      : { amount: null, currency: 'INR', waiverAvailable: false, oaType: 'none' },
    lastVerifiedAgainstUgcCareOn: this.lastVerifiedAgainstUgcCareOn,
  };
};

export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export { TYPES, MODES, BADGES, STATUSES, INDEXING, OA_TYPES };
