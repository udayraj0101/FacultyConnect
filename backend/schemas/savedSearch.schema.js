import { z } from 'zod';

const OPPORTUNITY_TYPES = ['fdp', 'conference', 'grant', 'journal'];

// Mirrors listOpportunitiesQuerySchema loosely — we accept anything the
// Discover UI puts in the URL and store it verbatim. Values are trimmed
// to keep the persisted blob compact; unrecognised keys are stripped so
// a client can't stuff arbitrary bloat into user records.
const filtersSchema = z
  .object({
    mode: z.enum(['online', 'offline', 'hybrid']).optional(),
    cost: z.enum(['free', 'paid']).optional(),
    domain: z.array(z.string().trim().min(1).max(60)).max(6).optional(),
    q: z.string().trim().max(120).optional(),
    sort: z
      .enum(['newest', 'domain_match', 'deadline_asc', 'deadline_desc'])
      .optional(),
    indexing: z.array(z.string()).max(8).optional(),
    credit_hours_min: z.coerce.number().int().min(0).max(500).optional(),
    certificate: z.enum(['true', 'false']).optional(),
    agency: z.array(z.string()).max(12).optional(),
    amount_max: z.coerce.number().min(0).max(10_000_000_000).optional(),
    career_stage: z.array(z.string()).max(4).optional(),
    deadline_before: z.coerce.date().optional(),
  })
  .strip();

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1, 'Name required').max(100),
  type: z.enum(OPPORTUNITY_TYPES),
  filters: filtersSchema.default({}),
  alertsEnabled: z.boolean().default(true),
});

// Rename + toggle-alerts are the two edit operations. Filters are
// deliberately not editable — the user re-saves with a different
// combo instead. Keeps the mental model simple and audit trail honest.
export const updateSavedSearchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    alertsEnabled: z.boolean().optional(),
  })
  .strict();
