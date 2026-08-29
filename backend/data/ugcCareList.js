// Seeded UGC-CARE + Scopus indexing lookup. Keyed by ISSN.
// Phase 1: manual seed data. Phase 3 (M17) will replace this with a scheduled
// scraper against ugccare.unipune.ac.in. The date on each entry is what appears
// as "lastVerifiedAgainstUgcCareOn" — this is a compliance/transparency
// requirement (PRD §4.5) — never fake this value.

const asDate = s => new Date(s);

export const UGC_CARE_LIST = {
  '0256-2499': {
    title: 'Sadhana — Academy Proceedings in Engineering Sciences',
    onUgcCare: true,
    ugcCareGroup: 'Group I',
    scopusIndexed: true,
    lastVerifiedOn: asDate('2026-06-28'),
  },
  '0970-4140': {
    title: 'Journal of the Indian Institute of Science',
    onUgcCare: false,
    scopusIndexed: true,
    lastVerifiedOn: asDate('2026-06-12'),
  },
  '0019-4522': {
    title: 'Journal of the Institution of Engineers (India): Series A',
    onUgcCare: true,
    ugcCareGroup: 'Group I',
    scopusIndexed: true,
    lastVerifiedOn: asDate('2026-06-28'),
  },
  '0973-9505': {
    title: 'Journal of the Indian Statistical Association',
    onUgcCare: true,
    ugcCareGroup: 'Group II',
    scopusIndexed: false,
    lastVerifiedOn: asDate('2026-06-28'),
  },
};

function computeBadge(entry) {
  if (entry.onUgcCare) return 'ugc_care_verified';
  if (entry.scopusIndexed) return 'scopus_indexed';
  return 'unverified';
}

export function lookupIssn(rawIssn) {
  const issn = (rawIssn || '').trim().toUpperCase();
  const entry = UGC_CARE_LIST[issn];
  if (!entry) {
    return {
      issn,
      verified: false,
      badge: 'unverified',
      onUgcCare: false,
      scopusIndexed: false,
    };
  }
  const badge = computeBadge(entry);
  return {
    issn,
    verified: badge !== 'unverified',
    badge,
    title: entry.title,
    onUgcCare: Boolean(entry.onUgcCare),
    ugcCareGroup: entry.ugcCareGroup || null,
    scopusIndexed: Boolean(entry.scopusIndexed),
    lastVerifiedAgainstUgcCareOn: entry.lastVerifiedOn,
  };
}
