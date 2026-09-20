import { z } from 'zod';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];

export const createJobSchema = z.object({
  title: z.string().trim().min(4).max(200),
  department: z.string().trim().min(2).max(120),
  designation: z.enum(DESIGNATIONS),
  qualifications: z.string().trim().min(5).max(2000),
  description: z.string().trim().min(20).max(4000),
  domainTags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  location: z.string().trim().max(120).optional(),
  experienceYears: z.number().int().min(0).max(60).default(0),
  salaryDisclosed: z.string().trim().max(120).optional(),
  deadline: z.coerce.date(),
});

// PATCH /v1/jobs/:id (CA-04). All fields optional so admins can nudge a
// typo or extend a deadline without re-submitting the whole posting.
// Status is deliberately NOT editable here — it stays on its own route
// (/status) which also handles the notification side-effects.
export const updateJobSchema = createJobSchema.partial().strict();

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
