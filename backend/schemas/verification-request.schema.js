import { z } from 'zod';

export const listVerificationsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  entityType: z.enum(['institution', 'organizer']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reviewVerificationSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(v => v.decision === 'approved' || (v.reason && v.reason.trim().length >= 5), {
    message: 'A reason of at least 5 characters is required when rejecting',
    path: ['reason'],
  });
