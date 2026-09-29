import { z } from 'zod';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];
const PAY_LEVELS = ['L10', 'L11', 'L12', 'L13A', 'L14', 'L15'];
const EMPLOYMENT_TYPES = ['regular', 'tenure_track', 'contract', 'visiting'];

// URL validator with empty-string tolerance. The admin form sends ""
// when a field is unset; without the transform, zod's url() would
// reject that and force the frontend to strip empties before POSTing.
// Only http/https allowed — no javascript:, mailto:, or data: URLs.
const optionalHttpsUrl = z
  .union([z.string().trim().url(), z.literal(''), z.null()])
  .transform(v => (v === '' || v == null ? null : v))
  .refine(v => v == null || /^https?:\/\//i.test(v), {
    message: 'Must be an http:// or https:// URL',
  })
  .optional();

// Reservation roster: UR/SC/ST/OBC/EWS are vertical (they SUM to the total
// vacancy count). PwD is horizontal — seats carved OUT of the vertical
// buckets — so it caps at `vacancies` but doesn't add to the sum.
const reservationSchema = z
  .object({
    UR: z.number().int().min(0).max(500).default(0),
    SC: z.number().int().min(0).max(500).default(0),
    ST: z.number().int().min(0).max(500).default(0),
    OBC: z.number().int().min(0).max(500).default(0),
    EWS: z.number().int().min(0).max(500).default(0),
    PwD: z.number().int().min(0).max(500).default(0),
  })
  .default({ UR: 0, SC: 0, ST: 0, OBC: 0, EWS: 0, PwD: 0 });

// Cross-field invariants: only enforced when the admin actually filled the
// reservation block in (i.e. at least one vertical category is non-zero).
// Empty roster is fine — non-gov institutions won't use this.
function attachReservationInvariants(schema) {
  return schema.superRefine((data, ctx) => {
    const r = data.reservation;
    if (!r) return;
    const verticalSum = r.UR + r.SC + r.ST + r.OBC + r.EWS;
    const anyVerticalSet = verticalSum > 0;
    if (!anyVerticalSet && r.PwD === 0) return;
    if (anyVerticalSet && verticalSum !== data.vacancies) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reservation'],
        message: `Vertical categories (UR+SC+ST+OBC+EWS = ${verticalSum}) must equal total vacancies (${data.vacancies}).`,
      });
    }
    if (r.PwD > data.vacancies) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reservation', 'PwD'],
        message: `PwD seats (${r.PwD}) cannot exceed total vacancies (${data.vacancies}).`,
      });
    }
  });
}

const createJobBase = z.object({
  title: z.string().trim().min(4).max(200),
  department: z.string().trim().min(2).max(120),
  designation: z.enum(DESIGNATIONS),
  qualifications: z.string().trim().min(5).max(2000),
  description: z.string().trim().min(20).max(4000),
  domainTags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  location: z.string().trim().max(120).optional(),
  experienceYears: z.number().int().min(0).max(60).default(0),
  salaryDisclosed: z.string().trim().max(120).optional(),
  // Empty string coerces to null so the UI can send "" from an unset
  // dropdown without failing the enum check.
  payLevel: z
    .union([z.enum(PAY_LEVELS), z.literal(''), z.null()])
    .transform(v => (v === '' || v == null ? null : v))
    .optional(),
  employmentType: z
    .union([z.enum(EMPLOYMENT_TYPES), z.literal(''), z.null()])
    .transform(v => (v === '' || v == null ? null : v))
    .optional(),
  advertisementUrl: optionalHttpsUrl,
  externalApplyUrl: optionalHttpsUrl,
  vacancies: z.number().int().min(1).max(500).default(1),
  reservation: reservationSchema,
  deadline: z.coerce.date(),
  // Two entry points on the Post Job form: "Publish" (default) and
  // "Save as draft". `archived` and `closed` can't be created directly
  // — they're only reachable via the /status route on an existing job.
  status: z.enum(['draft', 'open']).default('open'),
});

export const createJobSchema = attachReservationInvariants(createJobBase);

// PATCH /v1/jobs/:id (CA-04). All fields optional so admins can nudge a
// typo or extend a deadline without re-submitting the whole posting.
// Status is deliberately NOT editable here — it stays on its own route
// (/status) which also handles the notification side-effects.
// The reservation-sum invariant runs on PATCH too, but only if the
// caller sent both `vacancies` and `reservation` in the patch — the
// frontend re-sends both together when either changes.
export const updateJobSchema = createJobBase.partial().strict().superRefine((data, ctx) => {
  if (data.vacancies === undefined || data.reservation === undefined) return;
  const r = data.reservation;
  const verticalSum = r.UR + r.SC + r.ST + r.OBC + r.EWS;
  const anyVerticalSet = verticalSum > 0;
  if (anyVerticalSet && verticalSum !== data.vacancies) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reservation'],
      message: `Vertical categories (UR+SC+ST+OBC+EWS = ${verticalSum}) must equal total vacancies (${data.vacancies}).`,
    });
  }
  if (r.PwD > data.vacancies) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reservation', 'PwD'],
      message: `PwD seats (${r.PwD}) cannot exceed total vacancies (${data.vacancies}).`,
    });
  }
});

function csvList(values) {
  return z
    .string()
    .optional()
    .transform(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined))
    .refine(list => !list || list.every(v => values.includes(v)), {
      message: `must be a comma-separated list from: ${values.join(', ')}`,
    });
}

export const listJobsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  designation: csvList(DESIGNATIONS),
  domain: z
    .string()
    .optional()
    .transform(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined)),
  location: z.string().trim().max(120).optional(),
  institutionId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i)
    .optional(),
  // Default newest-first so freshly-posted jobs surface at the top of
  // the Job Board (mirror of the Discover feed behavior).
  sort: z.enum(['newest', 'deadline_asc', 'deadline_desc']).default('newest'),
  include_expired: z
    .string()
    .optional()
    .transform(v => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const applicationStatusSchema = z.object({
  status: z.enum(['applied', 'shortlisted', 'interview', 'closed']),
  notes: z.string().trim().max(1000).optional(),
});

// POST /jobs/:id/applicants/bulk-status — reused by the multi-select
// bulk-move affordance in the kanban. Body accepts up to 100 ids per
// call (arbitrary cap; kanbans in practice rarely exceed 30 applicants
// per column).
export const bulkStatusSchema = z.object({
  applicationIds: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }))
    .min(1, 'Select at least one applicant')
    .max(100, 'At most 100 applicants per batch'),
  status: z.enum(['applied', 'shortlisted', 'interview', 'closed']),
});

// PATCH /jobs/:id/applicants/:appId/review — kept separate from the
// status route so admins can leave a scorecard without also having to
// move the applicant across pipeline stages. All fields optional so a
// reviewer can update just notes, just their rating, or both.
export const applicationReviewSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).optional(),
    // Explicit "remove my scorecard" affordance. Prevents needing a
    // separate DELETE endpoint for a small feature.
    removeMyScorecard: z.boolean().optional(),
  })
  .refine(v => v.notes !== undefined || v.rating !== undefined || v.comment !== undefined || v.removeMyScorecard, {
    message: 'Provide at least one of: notes, rating, comment, removeMyScorecard',
  });
