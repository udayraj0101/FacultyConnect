import mongoose from 'mongoose';

const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'];
const SUBSCRIPTION_TIERS = ['free', 'paid'];

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
  },
  { timestamps: true },
);

institutionSchema.index({ name: 'text' });

institutionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    domain: this.domain,
    aisheCode: this.aisheCode,
    verificationStatus: this.verificationStatus,
    subscriptionTier: this.subscriptionTier,
    branding: this.branding || { logoUrl: null, primaryColor: null },
  };
};

export const Institution = mongoose.model('Institution', institutionSchema);
export { VERIFICATION_STATUSES, SUBSCRIPTION_TIERS };
