import mongoose from 'mongoose';

const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'];
const SUBSCRIPTION_TIERS = ['free', 'paid'];

// Slugify an institution name into a stable URL handle. Same rules as
// the faculty publicHandle: lowercase, ascii-alnum + hyphens only.
// Truncated to 60 chars to keep URLs sane. Kept module-scoped so the
// controller/backfill script can reuse it without touching the schema.
export function slugifyInstitutionName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    aisheCode: { type: String, default: null, trim: true, index: true, sparse: true },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'pending',
      index: true,
    },
    subscriptionTier: { type: String, enum: SUBSCRIPTION_TIERS, default: 'free' },
    branding: {
      logoUrl: { type: String, default: null },
      primaryColor: { type: String, default: null },
    },
    // Vanity slug for the public institution page, e.g. "iit-madras".
    // Set once on verification and never rewritten (protects inbound
    // links + SEO). Unique + sparse so unset docs don't collide.
    publicHandle: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    // Auto-enabled on verification (institutions are public entities
    // and always want SEO). Admins can flip this off later if legal
    // asks — the /public/institution endpoint gates on it.
    publicProfileEnabled: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

institutionSchema.index({ name: 'text' });

// On save of a verified institution, mint a publicHandle from the
// name (idempotent — never rewritten) and auto-enable the public
// profile on first insert. Pending/rejected institutions never get
// either. Async form (Mongoose 7+) avoids the classic
// "next is not a function" trap when middleware chains vary.
institutionSchema.pre('save', async function autoPublicMeta() {
  if (this.verificationStatus === 'verified') {
    if (!this.publicHandle) {
      this.publicHandle = slugifyInstitutionName(this.name);
    }
    if (this.publicProfileEnabled === false && this.isNew) {
      this.publicProfileEnabled = true;
    }
  }
});

institutionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    domain: this.domain,
    aisheCode: this.aisheCode,
    verificationStatus: this.verificationStatus,
    subscriptionTier: this.subscriptionTier,
    branding: this.branding || { logoUrl: null, primaryColor: null },
    publicHandle: this.publicHandle || null,
    publicProfileEnabled: this.publicProfileEnabled,
  };
};

export const Institution = mongoose.model('Institution', institutionSchema);
export { VERIFICATION_STATUSES, SUBSCRIPTION_TIERS };
