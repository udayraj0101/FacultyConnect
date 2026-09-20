import { z } from 'zod';

const emailField = z.string().trim().toLowerCase().email('Valid email required');
const nameField = z.string().trim().max(120).optional();

// Single-invite endpoint: strict — you can only submit one email at a time,
// so reject early if it's malformed. `allowDomainMismatch` opts the caller
// past the CA-01 domain check (institutional email must match institution
// domain unless the admin explicitly confirms). The frontend surfaces a
// warning + confirm checkbox and re-posts with the flag set.
export const inviteFacultySchema = z.object({
  email: emailField,
  name: nameField,
  allowDomainMismatch: z.boolean().default(false),
});

// Bulk endpoint: lenient — the service filters malformed rows per-row and
// returns them in the result matrix. If zod rejected the whole batch on
// one bad row, users would have to hand-clean their CSVs (defeating the
// point of bulk import). Cap length to prevent absurd payloads.
const bulkRowSchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  name: z.string().trim().max(120).optional(),
});

export const bulkInviteFacultySchema = z.object({
  invites: z.array(bulkRowSchema).min(1).max(500, 'Max 500 invites per batch'),
  allowDomainMismatch: z.boolean().default(false),
});

// Offboarding a roster member. `purge=true` hard-deletes the Faculty doc
// but only if the account was never claimed (no passwordHash); otherwise
// we detach institutionId and keep the account for the user's own records.
export const offboardFacultySchema = z.object({
  purge: z.boolean().default(false),
});

export const rejectFacultySchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const listFacultyQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected']).optional(),
});
