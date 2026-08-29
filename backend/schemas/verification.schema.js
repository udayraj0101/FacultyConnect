import { z } from 'zod';

const ISSN = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{3}[\dxX]$/, { message: 'ISSN must look like NNNN-NNNC (e.g. 0256-2499)' });

export const verifyIssnQuerySchema = z.object({ issn: ISSN });

export const opportunityVerificationSchema = z.object({
  verificationBadge: z.enum(['ugc_care_verified', 'scopus_indexed', 'unverified']),
  lastVerifiedAgainstUgcCareOn: z.coerce.date().optional(),
});
