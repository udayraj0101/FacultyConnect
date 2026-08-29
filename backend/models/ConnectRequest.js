import mongoose from 'mongoose';

const PURPOSES = [
  'co_author',
  'phd_advisory',
  'joint_fdp',
  'guest_lecture',
  'grant_collab',
  'other',
];

const STATUSES = ['pending', 'accepted', 'declined'];

export const PURPOSE_LABELS = {
  co_author: 'Co-author a paper',
  phd_advisory: 'PhD advisory / co-supervision',
  joint_fdp: 'Host a joint FDP',
  guest_lecture: 'Guest lecture invitation',
  grant_collab: 'Grant collaboration',
  other: 'Other',
};

const connectRequestSchema = new mongoose.Schema(
  {
    fromFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    toFacultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    purpose: { type: String, enum: PURPOSES, required: true },
    message: { type: String, required: true, maxlength: 300 },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Only one pending request allowed per sender→receiver pair (dedupe by-partial).
connectRequestSchema.index(
  { fromFacultyId: 1, toFacultyId: 1, status: 1 },
  { partialFilterExpression: { status: 'pending' }, unique: true },
);

export const ConnectRequest = mongoose.model('ConnectRequest', connectRequestSchema);
export { PURPOSES, STATUSES };
