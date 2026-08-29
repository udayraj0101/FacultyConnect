import { z } from 'zod';

export const createInstitutionSchema = z.object({
  name: z.string().trim().min(3).max(200),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, { message: 'Must be a valid domain like iitm.ac.in' }),
  aisheCode: z
    .string()
    .trim()
    .regex(/^[A-Z]-\d{3,7}$/i, { message: 'AISHE code looks like C-12345 or U-1234' })
    .optional(),
});

export const listInstitutionsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  verifiedOnly: z
    .string()
    .optional()
    .transform(v => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  // Cap generous enough for the signup dropdown to load every verified
  // institution in one shot. If the corpus grows past this, switch the
  // dropdown to a searchable async picker instead of paging.
  limit: z.coerce.number().int().min(1).max(500).default(20),
});
