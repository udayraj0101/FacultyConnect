// Grant + FDP filter vocabulary shared between DiscoverShell (card grid
// + sidebar filters) and OpportunityDetail. Backend enums stay
// authoritative; this file mirrors them for UI labelling.

export const AGENCY_META = {
  dst: { short: 'DST', long: 'Department of Science & Technology' },
  serb: { short: 'SERB', long: 'Science and Engineering Research Board' },
  anrf: { short: 'ANRF', long: 'Anusandhan National Research Foundation' },
  dbt: { short: 'DBT', long: 'Department of Biotechnology' },
  icssr: { short: 'ICSSR', long: 'Indian Council of Social Science Research' },
  aicte: { short: 'AICTE', long: 'All India Council for Technical Education' },
  meity: { short: 'MeitY', long: 'Ministry of Electronics & IT' },
  csir: { short: 'CSIR', long: 'Council of Scientific & Industrial Research' },
  ugc: { short: 'UGC', long: 'University Grants Commission' },
  industry: { short: 'Industry', long: 'Industry-funded' },
  international: { short: 'International', long: 'International funder' },
  other: { short: 'Other', long: 'Other agency' },
};

export const AGENCY_ORDER = [
  'dst',
  'serb',
  'anrf',
  'dbt',
  'csir',
  'ugc',
  'aicte',
  'meity',
  'icssr',
  'industry',
  'international',
  'other',
];

export const CAREER_STAGE_META = {
  early_career: { short: 'Early career', long: 'Early-career (first ~5 years post-PhD)' },
  mid_career: { short: 'Mid career', long: 'Mid-career (Associate / early Full Professor)' },
  senior: { short: 'Senior', long: 'Senior (established PI)' },
  any: { short: 'Any stage', long: 'Any career stage' },
};

export const CAREER_STAGE_ORDER = ['early_career', 'mid_career', 'senior', 'any'];

// INR range slots used as filter presets. Faculty rarely think in
// arbitrary numbers — they think "up to a lakh", "up to 50L", "up to a
// crore", so we bucket the slider into rounded steps.
export const AMOUNT_PRESETS = [
  { value: '', label: 'Any amount' },
  { value: '500000', label: 'Up to Rs. 5 L' },
  { value: '2000000', label: 'Up to Rs. 20 L' },
  { value: '5000000', label: 'Up to Rs. 50 L' },
  { value: '10000000', label: 'Up to Rs. 1 Cr' },
  { value: '100000000', label: 'Up to Rs. 10 Cr' },
];

// Format an INR amount into a compact "Rs. 12.5 L" / "Rs. 2 Cr" string.
// null / undefined / 0 all render as an empty string so callers can
// short-circuit rendering without a null check.
export function formatInr(amount) {
  if (amount == null || amount <= 0) return '';
  if (amount >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(amount % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (amount >= 100_000) return `Rs. ${(amount / 100_000).toFixed(amount % 100_000 === 0 ? 0 : 1)} L`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

// Compact human-readable range: "Rs. 5L – 50L" / "Up to 50L" / "From 5L".
export function formatAmountRange(min, max) {
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  if (!hasMin && !hasMax) return '';
  if (hasMin && hasMax) return `${formatInr(min)} – ${formatInr(max)}`;
  if (hasMax) return `Up to ${formatInr(max)}`;
  return `From ${formatInr(min)}`;
}
