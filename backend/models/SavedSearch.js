import mongoose from 'mongoose';

const OPPORTUNITY_TYPES = ['fdp', 'conference', 'grant', 'journal'];

// Per-faculty persisted filter combo from the Discover experience.
// When alertsEnabled is true, the nightly saved-search cron re-runs the
// filters and fires a notification via notify() for any Opportunity
// created since lastAlertedAt. First-run doesn't fire — it only records
// lastAlertedAt = now so we don't spam users with matches that were
// already visible when they saved.
const savedSearchSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    // Human-readable label. Auto-composed from the active filters when
    // the user hits "Save this search" but they can rename it.
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Denormalised out of `filters` for a fast index lookup ("show me my
    // journal saved searches") and to render the correct card style on
    // the /saved-searches page.
    type: { type: String, enum: OPPORTUNITY_TYPES, required: true, index: true },
    // Flexible bag of everything the Discover list endpoint accepts.
    // Kept as Mixed so schema evolution (new filter keys) doesn't force
    // a migration of existing saved searches. Shape mirrors
    // listOpportunitiesQuerySchema.
    filters: { type: mongoose.Schema.Types.Mixed, default: {}, required: true },
    alertsEnabled: { type: Boolean, default: true, index: true },
    // Nightly cron uses this to filter "only opportunities created since"
    // — prevents the first alert from including stale matches. Null on
    // creation; the cron sets it to now on first pass without alerting.
    lastAlertedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound index for the primary query: alerts-enabled searches sorted
// by lastAlertedAt so we can round-robin the cron cheaply as scale grows.
savedSearchSchema.index({ alertsEnabled: 1, lastAlertedAt: 1 });

savedSearchSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    type: this.type,
    filters: this.filters || {},
    alertsEnabled: Boolean(this.alertsEnabled),
    lastAlertedAt: this.lastAlertedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
export { OPPORTUNITY_TYPES };
