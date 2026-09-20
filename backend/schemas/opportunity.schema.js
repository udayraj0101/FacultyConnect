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
  deadline_before: z.coerce.date().optional(),
  q: z.string().trim().max(120).optional(),
  // Default to newest-first so freshly-published listings surface
  // immediately on the Discover feed. Faculty can flip to deadline order
  // via the sort dropdown when they're urgency-hunting.
  sort: z.enum(['newest', 'deadline_asc', 'deadline_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  include_expired: z
    .string()
    .optional()
    .transform(v => v === 'true'),
});
