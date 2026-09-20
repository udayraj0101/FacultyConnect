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

// Indian funding agencies faculty regularly apply to, plus catch-alls.
// Grant-type opportunities primarily use this. Adding a new agency is
// a schema change (index + enum) so keep the catch-all buckets around.
const GRANT_AGENCIES = [
  'dst',
  'serb',
  'anrf',
  'dbt',
  'icssr',
  'aicte',
  'meity',
  'csir',
  'ugc',
  'industry',
  'international',
  'other',
];

// Career stage the grant is aimed at. `any` means the grant is open to
// all faculty and the filter shouldn't narrow it out.
const CAREER_STAGES = ['early_career', 'mid_career', 'senior', 'any'];

// Roles the applicant can hold on a grant. Mirrors Faculty.grantsReceived
// role enum so future co-PI matching can compare like-for-like.
const GRANT_ROLES = ['pi', 'co_pi', 'investigator'];

// Indian states + UTs. FDP + conference filters use these; grants and
// journals typically ignore location. Names match INDIAN_STATES on the
// frontend (frontend/src/lib/indianStates.js) — keep in sync manually.
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

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
    // Structured location for offline-heavy types (FDP, conference). Kept
    // alongside `location` (free-text) rather than replacing it so admins
    // can still type a hostel or campus name. Any-match state filter on
    // discover; city is case-insensitive substring match.
    state: { type: String, enum: INDIAN_STATES, default: null, index: true },
    city: { type: String, default: null, trim: true, maxlength: 120 },
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
    // FDP + conference filters. AICTE / CPD credit hours are the primary
    // reason faculty attend, and "certificate provided" is a hard filter
    // for CAS documentation. Left null on non-FDP/conference docs so the
    // UI can distinguish "unset" from "explicitly zero credit hours".
    creditHours: { type: Number, default: null, min: 0, max: 500 },
    certificateProvided: { type: Boolean, default: false },
    // Grant-type filters. amountMin/Max are inclusive INR bounds; a
    // grant with a single fixed amount uses the same value for both.
    // eligibleRoles governs whether an early-career PI can apply on
    // their own or must join as Co-PI.
    agency: { type: String, enum: GRANT_AGENCIES, default: null, index: true },
    amountMin: { type: Number, default: null, min: 0 },
    amountMax: { type: Number, default: null, min: 0 },
    careerStage: {
      type: [{ type: String, enum: CAREER_STAGES }],
      default: [],
      index: true,
    },
    eligibleRoles: {
      type: [{ type: String, enum: GRANT_ROLES }],
      default: [],
    },
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
    state: this.state || null,
    city: this.city || null,
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
    creditHours: this.creditHours ?? null,
    certificateProvided: Boolean(this.certificateProvided),
    agency: this.agency || null,
    amountMin: this.amountMin ?? null,
    amountMax: this.amountMax ?? null,
    careerStage: this.careerStage || [],
    eligibleRoles: this.eligibleRoles || [],
    lastVerifiedAgainstUgcCareOn: this.lastVerifiedAgainstUgcCareOn,
    // Surfaced so the saved-search cron can determine "new since last
    // alerted" without an extra query. Also useful for "posted X days
    // ago" copy on cards down the line.
    createdAt: this.createdAt,
  };
};

export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export {
  TYPES,
  MODES,
  BADGES,
  STATUSES,
  INDEXING,
  OA_TYPES,
  GRANT_AGENCIES,
  CAREER_STAGES,
  GRANT_ROLES,
  INDIAN_STATES,
};
