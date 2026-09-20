import { z } from 'zod';

export const sendMessageSchema = z
  .object({
    toFacultyId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' }),
    body: z.string().trim().min(1, 'Message body cannot be empty').max(5000),
  })
  .strict();

export const listMessagesQuerySchema = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
