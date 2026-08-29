import mongoose from 'mongoose';

const ENTITY_TYPES = ['institution', 'organizer'];
const STATUSES = ['pending', 'approved', 'rejected'];
const REF_MODELS = ['Institution'];

const verificationRequestSchema = new mongoose.Schema(
  {
    entityType: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityRefModel',
      index: true,
    },
    entityRefModel: { type: String, enum: REF_MODELS, required: true },
    submittedDocs: { type: [String], default: [] },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
    reviewedAt: { type: Date, default: null },
    reason: { type: String, default: null },
  },
  { timestamps: true },
);

verificationRequestSchema.methods.toPublicJSON = function toPublicJSON() {
  const entity = this.entityId;
  const entityPopulated =
    entity && typeof entity === 'object' && entity._id
      ? {
          id: entity._id.toString(),
          name: entity.name,
          domain: entity.domain,
          aisheCode: entity.aisheCode,
          verificationStatus: entity.verificationStatus,
        }
      : null;
  const reviewer = this.reviewedBy;
  const reviewerPopulated =
    reviewer && typeof reviewer === 'object' && reviewer._id
      ? { id: reviewer._id.toString(), name: reviewer.name, email: reviewer.email }
      : null;
  return {
    id: this._id.toString(),
    entityType: this.entityType,
    entityId: entityPopulated ? entityPopulated.id : entity?.toString?.() || null,
    entity: entityPopulated,
    submittedDocs: this.submittedDocs,
    status: this.status,
    reviewedBy: reviewerPopulated,
    reviewedAt: this.reviewedAt,
    reason: this.reason,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const VerificationRequest = mongoose.model('VerificationRequest', verificationRequestSchema);
export { ENTITY_TYPES, STATUSES };
