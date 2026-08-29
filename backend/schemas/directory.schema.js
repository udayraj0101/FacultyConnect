import { z } from 'zod';

export const searchDirectoryQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  domain: z.string().trim().max(60).optional(),
  designation: z.enum(['Assistant', 'Associate', 'Professor', 'Guest', 'Research']).optional(),
  institutionId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' })
    .optional(),
  sort: z.enum(['relevance', 'citations', 'hIndex', 'publications', 'name']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
