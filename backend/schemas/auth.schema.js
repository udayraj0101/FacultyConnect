import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  designation: z.enum(['Assistant', 'Associate', 'Professor', 'Guest', 'Research']).optional(),
  institutionId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' })
    .nullable()
    .optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent to data processing is required (DPDP Act 2023)' }) }),
});

export const completeOnboardingSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Consent to data processing is required (DPDP Act 2023)' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

// Forgot-password: only email needed. Handler always returns 200 whether
// or not the email exists so an attacker can't enumerate accounts.
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email required'),
});

// Reset-password: new password with the same constraints as signup /
// onboarding. No consent flag — user already consented once and this
// isn't creating a new account.
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});
