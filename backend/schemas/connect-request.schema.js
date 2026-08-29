import { z } from 'zod';

export const createConnectRequestSchema = z.object({
  toFacultyId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }),
  purpose: z.enum([
    'co_author',
    'phd_advisory',
    'joint_fdp',
    'guest_lecture',
    'grant_collab',
    'other',
  ]),
  message: z
    .string()
    .trim()
    .min(10, { message: 'Message must be at least 10 characters' })
    .max(300, { message: 'Message must be at most 300 characters' }),
});

export const listConnectRequestsQuerySchema = z.object({
  direction: z.enum(['sent', 'received']).default('received'),
  status: z.enum(['pending', 'accepted', 'declined']).optional(),
});

export const respondConnectRequestSchema = z.object({
  decision: z.enum(['accepted', 'declined']),
});
