import { z } from 'zod';

const emailField = z.string().trim().toLowerCase().email('Valid email required');
const nameField = z.string().trim().max(120).optional();

// Single-invite endpoint: strict — you can only submit one email at a time,
// so reject early if it's malformed.
export const inviteFacultySchema = z.object({
  email: emailField,
  name: nameField,
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
});

export const rejectFacultySchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const listFacultyQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected']).optional(),
});
