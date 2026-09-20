import mongoose from 'mongoose';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];
const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'];
const ROLES = ['Faculty', 'CollegeAdmin', 'OpportunityOrganizer', 'PlatformAdmin'];
const GRANT_ROLES = ['PI', 'Co-PI', 'Investigator', 'Consultant'];
// Directory-searchable intent flags. Faculty declare what they're open
// to receiving requests for, so the Directory becomes searchable by
// outcome ("who wants a Co-PI") not just domain overlap.
const OPEN_TO_OPTIONS = ['co_author', 'phd_student', 'co_pi', 'reviewer'];

const employmentSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true, trim: true },
    designation: { type: String, trim: true },
    from: { type: Number, default: null },
    to: { type: Number, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true },
    field: { type: String, trim: true, default: '' },
    institution: { type: String, trim: true, default: '' },
    year: { type: Number, default: null },
  },
  { _id: true },
);

const awardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    year: { type: Number, default: null },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const grantSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    agency: { type: String, trim: true, default: '' },
    role: { type: String, enum: GRANT_ROLES, default: 'PI' },
    amount: { type: Number, default: null },
    year: { type: Number, default: null },
    ongoing: { type: Boolean, default: false },
  },
  { _id: true },
);

const externalLinksSchema = new mongoose.Schema(
  {
    website: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    googleScholar: { type: String, trim: true, default: '' },
    github: { type: String, trim: true, default: '' },
    twitter: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    // Optional so we can create invite-only "placeholder" accounts before
    // the faculty claims them via the onboarding link. Login refuses these
    // (see auth.service — passwordHash falsy = INVITE_PENDING).
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ROLES, default: 'Faculty', index: true },
    institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', default: null },
    // Invitation trail — populated when a CollegeAdmin creates the account.
    invitedByFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      default: null,
      index: true,
    },
    invitedAt: { type: Date, default: null },
    // Hashed one-time onboarding token (bcrypt-hashed, like refreshTokenHash).
    // Cleared when the faculty completes onboarding and sets a password.
    onboardingTokenHash: { type: String, default: null },
    onboardingTokenExpires: { type: Date, default: null },
    designation: { type: String, enum: DESIGNATIONS, default: 'Assistant' },
    department: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '', maxlength: 1000 },
    domainTags: { type: [String], default: [] },
    orcidId: { type: String, default: null, index: true, sparse: true },
    scopusAuthorId: { type: String, default: null },
    citationCount: { type: Number, default: 0 },
    hIndex: { type: Number, default: 0 },
    i10Index: { type: Number, default: 0 },
    directoryVisible: { type: Boolean, default: false },
    // Distinct from directoryVisible: opts into a public, SEO-indexable
    // profile page at /f/{id}. DPDP Act 2023 requires explicit consent
    // for public display, so this is off by default and gated by its
    // own toggle. Email and phone are ALWAYS excluded from public JSON
    // even when this is true (contact stays locked per PRD §3.5).
    publicProfileEnabled: { type: Boolean, default: false, index: true },
    // Vanity slug for the public profile, e.g. "ananya-krishnan". Set once
    // on first public-profile enable and never rewritten (protects inbound
    // links). Unique across all Faculty. Sparse so accounts without a
    // handle don't collide on `null`.
    publicHandle: { type: String, default: null, trim: true, index: true, sparse: true },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'pending' },
    lastLogin: { type: Date, default: null },
    refreshTokenHash: { type: String, default: null },
    bookmarkedOpportunityIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' }],
      default: [],
    },
    employmentHistory: { type: [employmentSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    awards: { type: [awardSchema], default: [] },
    grantsReceived: { type: [grantSchema], default: [] },
    externalLinks: { type: externalLinksSchema, default: () => ({}) },
    // Multi-select intent flags — see OPEN_TO_OPTIONS. Any-match filter
    // on directory search (open_to=co_pi returns everyone open to Co-PI
    // requests, regardless of what else they're open to). Indexed for
    // the intent-based lookups the Directory now supports.
    openTo: {
      type: [{ type: String, enum: OPEN_TO_OPTIONS }],
      default: [],
      index: true,
    },
  },
  { timestamps: true },
);

// Directory search: text over name + domainTags. CLAUDE.md §4 says use $text
// for dev; will migrate to Atlas Search past ~10k profiles per PRD §8.
facultySchema.index({ name: 'text', domainTags: 'text' });

facultySchema.methods.toDirectoryJSON = function toDirectoryJSON() {
  const inst = this.institutionId;
  const populatedInst =
    inst && typeof inst === 'object' && inst._id
      ? {
          id: inst._id.toString(),
          name: inst.name,
          verificationStatus: inst.verificationStatus,
        }
      : null;
  // Directory results are deliberately public-safe: no email/phone (those
  // stay hidden until a connect request is accepted per PRD §3.5).
  // Professional-profile fields (bio, employment, education, awards,
  // grants, external links) DO surface here — that's the whole point of
  // opting in to directory visibility.
  return {
    id: this._id.toString(),
    name: this.name,
    designation: this.designation,
    department: this.department || '',
    bio: this.bio || '',
    orcidId: this.orcidId,
    domainTags: this.domainTags || [],
    citationCount: this.citationCount,
    hIndex: this.hIndex,
    i10Index: this.i10Index,
    institution: populatedInst,
    publicHandle: this.publicHandle || null,
    openTo: this.openTo || [],
    employmentHistory: (this.employmentHistory || []).map(serializeSubdoc),
    education: (this.education || []).map(serializeSubdoc),
    awards: (this.awards || []).map(serializeSubdoc),
    grantsReceived: (this.grantsReceived || []).map(serializeSubdoc),
    externalLinks: {
      website: this.externalLinks?.website || '',
      linkedin: this.externalLinks?.linkedin || '',
      googleScholar: this.externalLinks?.googleScholar || '',
      github: this.externalLinks?.github || '',
      twitter: this.externalLinks?.twitter || '',
    },
  };
};

function serializeSubdoc(doc) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return { ...raw, id: raw._id?.toString?.() || raw.id, _id: undefined };
}

facultySchema.methods.toPublicJSON = function toPublicJSON() {
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
    name: this.name,
    email: this.email,
    phone: this.phone || '',
    role: this.role,
    designation: this.designation,
    department: this.department || '',
    bio: this.bio || '',
    domainTags: this.domainTags,
    orcidId: this.orcidId,
    scopusAuthorId: this.scopusAuthorId,
    citationCount: this.citationCount,
    hIndex: this.hIndex,
    i10Index: this.i10Index,
    directoryVisible: this.directoryVisible,
    publicProfileEnabled: this.publicProfileEnabled,
    publicHandle: this.publicHandle || null,
    openTo: this.openTo || [],
    awaitingOnboarding: !this.passwordHash,
    invitedAt: this.invitedAt,
    verificationStatus: this.verificationStatus,
    bookmarkedOpportunityIds: (this.bookmarkedOpportunityIds || []).map(x => x.toString()),
    institutionId: populatedInst ? populatedInst.id : inst ? inst.toString() : null,
    institution: populatedInst,
    employmentHistory: (this.employmentHistory || []).map(serializeSubdoc),
    education: (this.education || []).map(serializeSubdoc),
    awards: (this.awards || []).map(serializeSubdoc),
    grantsReceived: (this.grantsReceived || []).map(serializeSubdoc),
    externalLinks: {
      website: this.externalLinks?.website || '',
      linkedin: this.externalLinks?.linkedin || '',
      googleScholar: this.externalLinks?.googleScholar || '',
      github: this.externalLinks?.github || '',
      twitter: this.externalLinks?.twitter || '',
    },
  };
};

export const Faculty = mongoose.model('Faculty', facultySchema);
export { DESIGNATIONS, VERIFICATION_STATUSES, ROLES, GRANT_ROLES, OPEN_TO_OPTIONS };
