import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['opportunity', 'job', 'faculty']),
  targetId: z.string().regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }),
  category: z.enum([
    'predatory_journal',
    'fake_job',
    'fraudulent_organizer',
    'harassment',
    'spam',
    'other',
  ]),
  reason: z
    .string()
    .trim()
    .min(10, { message: 'Please describe the issue (10+ chars)' })
    .max(1000),
});

export const listReportsQuerySchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved', 'dismissed']).optional(),
  targetType: z.enum(['opportunity', 'job', 'faculty']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reviewReportSchema = z
  .object({
    decision: z.enum(['acknowledged', 'resolved', 'dismissed']),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(v => v.decision !== 'dismissed' || (v.notes && v.notes.length >= 5), {
    message: 'Dismissal requires a note (min 5 chars)',
    path: ['notes'],
  });
