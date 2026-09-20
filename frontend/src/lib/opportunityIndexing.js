// Journal indexing + open-access vocabulary shared between the Discover
// card grid, the opportunity detail page, and (eventually) the admin
// submission form. Backend accepts these exact enum values on the
// Opportunity model — keep this list in sync with backend/models/Opportunity.js.

export const INDEXING_META = {
  scopus: { short: 'Scopus', long: 'Scopus', tone: 'primary' },
  wos_scie: { short: 'WoS SCIE', long: 'Web of Science — SCIE', tone: 'primary' },
  wos_ssci: { short: 'WoS SSCI', long: 'Web of Science — SSCI', tone: 'primary' },
  wos_esci: { short: 'WoS ESCI', long: 'Web of Science — ESCI', tone: 'muted' },
  ugc_care_i: { short: 'UGC-CARE I', long: 'UGC-CARE Group I', tone: 'success' },
  ugc_care_ii: { short: 'UGC-CARE II', long: 'UGC-CARE Group II', tone: 'success' },
  doaj: { short: 'DOAJ', long: 'Directory of Open Access Journals', tone: 'muted' },
  pubmed: { short: 'PubMed', long: 'PubMed / MEDLINE', tone: 'muted' },
};

export const INDEXING_ORDER = [
  'scopus',
  'wos_scie',
  'wos_ssci',
  'wos_esci',
  'ugc_care_i',
  'ugc_care_ii',
  'doaj',
  'pubmed',
];

export const OA_TYPE_LABEL = {
  gold: 'Gold OA (author pays APC)',
  green: 'Green OA (self-archive allowed)',
  diamond: 'Diamond OA (free for author and reader)',
  hybrid: 'Hybrid (subscription + optional OA)',
  none: 'Subscription only',
};

const TONE_CLASS = {
  primary:
    'bg-primary/10 text-primary border-primary/30',
  success:
    'bg-success/10 text-success border-success/30',
  muted:
    'bg-muted text-text-muted border-border',
};

export function indexingChipClass(key) {
  const tone = INDEXING_META[key]?.tone || 'muted';
  return TONE_CLASS[tone];
}
