import mongoose from 'mongoose';

// `vidwan` is a manual-import tag (INFLIBNET has no public API for us to
// pull from). Users adding publications they lifted from their Vidwan
// profile can flag them with this source so the provenance is honest.
const SOURCES = ['orcid', 'scopus', 'scholar_csv', 'manual', 'vidwan'];

const publicationSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    authors: { type: [String], default: [] },
    year: { type: Number, default: null },
    venue: { type: String, default: null, trim: true },
    doi: { type: String, default: null, trim: true },
    source: { type: String, enum: SOURCES, required: true },
    citationCount: { type: Number, default: 0 },
    externalId: { type: String, default: null },
  },
  { timestamps: true },
);

publicationSchema.index(
  { facultyId: 1, source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } },
);

publicationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    authors: this.authors,
    year: this.year,
    venue: this.venue,
    doi: this.doi,
    source: this.source,
    citationCount: this.citationCount,
  };
};

export const Publication = mongoose.model('Publication', publicationSchema);
export { SOURCES };
