import { z } from 'zod';

const TYPES = ['fdp', 'conference', 'grant', 'journal'];
const MODES = ['online', 'offline', 'hybrid'];
const INDEXING = [
  'scopus',
  'wos_scie',
  'wos_ssci',
  'wos_esci',
  'ugc_care_i',
  'ugc_care_ii',
  'doaj',
  'pubmed',
];
const OA_TYPES = ['gold', 'green', 'diamond', 'hybrid', 'none'];
const QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4'];
const GRANT_AGENCIES = [
  'dst',
  'serb',
  'anrf',
  'dbt',
  'icssr',
  'aicte',
  'meity',
  'csir',
  'ugc',
  'industry',
  'international',
  'other',
];
const CAREER_STAGES = ['early_career', 'mid_career', 'senior', 'any'];
const GRANT_ROLES = ['pi', 'co_pi', 'investigator'];
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const apcSchema = z
  .object({
    amount: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
    currency: z.string().trim().max(8).default('INR'),
    waiverAvailable: z.boolean().default(false),
    oaType: z.enum(OA_TYPES).default('none'),
  })
  .strict()
  .optional();

export const createOpportunitySchema = z
  .object({
    type: z.enum(TYPES),
    title: z.string().trim().min(6, 'Title must be at least 6 characters').max(200),
    description: z
      .string()
      .trim()
      .min(30, 'Give faculty enough context — at least 30 characters')
      .max(4000),
    domainTags: z.array(z.string().trim().min(1)).max(12).default([]),
    mode: z.enum(MODES).default('offline'),
    location: z.string().trim().max(200).optional().or(z.literal('')),
    cost: z.coerce.number().min(0).max(10_000_000).default(0),
    deadline: z.coerce.date().refine(d => d.getTime() > Date.now(), {
      message: 'Deadline must be in the future',
    }),
    url: z
      .string()
      .trim()
      .url('Provide a valid URL (https://…)')
      .max(500)
      .optional()
      .or(z.literal('')),
    issn: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{3}[\dxX]$/, 'ISSN must look like 1234-5678')
      .optional()
      .or(z.literal('')),
    indexing: z.array(z.enum(INDEXING)).max(INDEXING.length).default([]),
    predatoryScreened: z.boolean().default(false),
    apc: apcSchema,
    quartile: z.enum(QUARTILES).nullable().optional(),
    citeScore: z.coerce.number().min(0).max(1000).nullable().optional(),
    citeScorePercentile: z.coerce.number().min(0).max(100).nullable().optional(),
    subjectArea: z.string().trim().max(160).nullable().optional(),
    creditHours: z.coerce.number().int().min(0).max(500).nullable().optional(),
    certificateProvided: z.boolean().optional(),
    agency: z.enum(GRANT_AGENCIES).nullable().optional(),
    amountMin: z.coerce.number().min(0).max(10_000_000_000).nullable().optional(),
    amountMax: z.coerce.number().min(0).max(10_000_000_000).nullable().optional(),
    careerStage: z.array(z.enum(CAREER_STAGES)).max(CAREER_STAGES.length).default([]),
    eligibleRoles: z.array(z.enum(GRANT_ROLES)).max(GRANT_ROLES.length).default([]),
    state: z.enum(INDIAN_STATES).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
  })
  .strict();

function csvList(values) {
  return z
    .string()
    .optional()
    .transform(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined))
    .refine(list => !list || list.every(v => values.includes(v)), {
      message: `must be a comma-separated list from: ${values.join(', ')}`,
    });
}

export const listOpportunitiesQuerySchema = z.object({
  type: csvList(TYPES),
  mode: z.enum(MODES).optional(),
  cost: z.enum(['free', 'paid']).optional(),
  domain: z
    .string()
    .optional()
    .transform(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined)),
  indexing: csvList(INDEXING),
  // Any-match against the Scopus quartile field. Journals without a
  // Q-rank set are excluded when the filter is on — Q-filtering is a
  // trust-quality drilldown and unranked journals aren't the target.
  quartile: csvList(QUARTILES),
  // FDP + conference filters.
  credit_hours_min: z.coerce.number().int().min(0).max(500).optional(),
  certificate: z.enum(['true', 'false']).optional(),
  // Grant filters. amount_min/max are inclusive INR bounds. career_stage
  // accepts CSV of the enum values. agency is a single value for now (we
  // can promote to CSV later if the demand shows up).
  agency: csvList(GRANT_AGENCIES),
  amount_min: z.coerce.number().min(0).max(10_000_000_000).optional(),
  amount_max: z.coerce.number().min(0).max(10_000_000_000).optional(),
  career_stage: csvList(CAREER_STAGES),
  // FDP + conference location + fee filters.
  state: csvList(INDIAN_STATES),
  city: z.string().trim().max(120).optional(),
  cost_max: z.coerce.number().int().min(0).max(10_000_000).optional(),
  // Event date-range filter — matches events that START inside the
  // window [starts_after, starts_before]. Either bound is optional.
  starts_after: z.coerce.date().optional(),
  starts_before: z.coerce.date().optional(),
  deadline_before: z.coerce.date().optional(),
  q: z.string().trim().max(120).optional(),
  // Default to newest-first so freshly-published listings surface
  // immediately on the Discover feed. Faculty can flip to deadline order
  // via the sort dropdown when they're urgency-hunting.
  sort: z
    .enum(['newest', 'deadline_asc', 'deadline_desc', 'domain_match'])
    .default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  include_expired: z
    .string()
    .optional()
    .transform(v => v === 'true'),
  include_facets: z
    .string()
    .optional()
    .transform(v => v === 'true'),
});
