import { z } from 'zod';

const OPEN_TO = ['co_author', 'phd_student', 'co_pi', 'reviewer'];

// Comma-separated csv of enum values from the URL. Empty / undefined
// leaves the filter unset. Unknown values fail zod so a bad deep-link
// doesn't silently return the wrong pool.
const openToCsv = z
  .string()
  .optional()
  .transform(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : undefined))
  .refine(list => !list || list.every(v => OPEN_TO.includes(v)), {
    message: `must be a comma-separated list from: ${OPEN_TO.join(', ')}`,
  });

export const searchDirectoryQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  domain: z.string().trim().max(60).optional(),
  designation: z.enum(['Assistant', 'Associate', 'Professor', 'Guest', 'Research']).optional(),
  institutionId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' })
    .optional(),
  open_to: openToCsv,
  // Co-PI finder passes this to hide faculty from the same institution
  // — different-institution collaborators are the whole point of a Co-PI
  // hunt. Silently ignored when the caller isn't authenticated.
  exclude_same_institution: z
    .string()
    .optional()
    .transform(v => v === 'true'),
  sort: z.enum(['relevance', 'citations', 'hIndex', 'publications', 'name']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
