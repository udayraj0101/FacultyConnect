import { z } from 'zod';

const CURRENT_YEAR = new Date().getFullYear();
const yearField = z
  .number()
  .int()
  .min(1900)
  .max(CURRENT_YEAR + 5)
  .nullable();

const employmentItem = z.object({
  id: z.string().optional(),
  institution: z.string().trim().min(1).max(200),
  designation: z.string().trim().max(120).default(''),
  from: yearField.optional(),
  to: yearField.optional(),
  current: z.boolean().default(false),
  description: z.string().trim().max(500).default(''),
});

const educationItem = z.object({
  id: z.string().optional(),
  degree: z.string().trim().min(1).max(60),
  field: z.string().trim().max(120).default(''),
  institution: z.string().trim().max(200).default(''),
  year: yearField.optional(),
});

const awardItem = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  year: yearField.optional(),
  description: z.string().trim().max(300).default(''),
});

const grantItem = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(200),
  agency: z.string().trim().max(120).default(''),
  role: z.enum(['PI', 'Co-PI', 'Investigator', 'Consultant']).default('PI'),
  amount: z.number().nonnegative().nullable().optional(),
  year: yearField.optional(),
  ongoing: z.boolean().default(false),
});

const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine(v => v === '' || /^https?:\/\/\S+$/i.test(v), {
    message: 'Must be a valid http(s) URL or empty',
  });

const externalLinksSchema = z.object({
  website: urlOrEmpty.optional(),
  linkedin: urlOrEmpty.optional(),
  googleScholar: urlOrEmpty.optional(),
  github: urlOrEmpty.optional(),
  twitter: urlOrEmpty.optional(),
});

export const updateFacultySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(20).optional(),
    designation: z.enum(['Assistant', 'Associate', 'Professor', 'Guest', 'Research']).optional(),
    department: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(1000).optional(),
    domainTags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    scopusAuthorId: z.string().trim().max(60).nullable().optional(),
    institutionId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, { message: 'Must be a 24-char hex id' })
      .nullable()
      .optional(),
    employmentHistory: z.array(employmentItem).max(30).optional(),
    education: z.array(educationItem).max(20).optional(),
    awards: z.array(awardItem).max(30).optional(),
    grantsReceived: z.array(grantItem).max(30).optional(),
    externalLinks: externalLinksSchema.optional(),
    openTo: z
      .array(z.enum(['co_author', 'phd_student', 'co_pi', 'reviewer']))
      .max(4)
      .optional(),
  })
  .strict();

export const visibilitySchema = z.object({
  directoryVisible: z.boolean(),
});

export const publicProfileSchema = z.object({
  publicProfileEnabled: z.boolean(),
});

// UGC 2018 CAS Research Score — manual counters. Every field is optional
// so the UI can send single-field updates as the user edits one row.
// Bounds mirror the Mongoose subdoc caps.
const nonNegInt = (max = 500) => z.coerce.number().int().min(0).max(max).optional();

export const casManualInputsSchema = z
  .object({
    phdAwarded: nonNegInt(200),
    phdOngoing: nonNegInt(200),
    mPhilAwarded: nonNegInt(200),
    booksInternational: nonNegInt(100),
    booksNational: nonNegInt(100),
    chaptersInternational: nonNegInt(500),
    chaptersNational: nonNegInt(500),
    editorInternational: nonNegInt(100),
    editorNational: nonNegInt(100),
    invitedLecturesIntlAbroad: nonNegInt(500),
    invitedLecturesIntlInIndia: nonNegInt(500),
    invitedLecturesNational: nonNegInt(500),
    invitedLecturesState: nonNegInt(500),
    consultancyLakhs: z.coerce.number().min(0).max(100000).optional(),
  })
  .strict();

export const addPublicationSchema = z
  .object({
    doi: z
      .string()
      .trim()
      .regex(/^10\.\S+\/\S+$/i, { message: 'DOI must look like 10.xxxx/yyyy' })
      .optional(),
    title: z.string().trim().min(3).max(500).optional(),
    authors: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
    year: z.number().int().min(1900).max(CURRENT_YEAR + 2).nullable().optional(),
    venue: z.string().trim().max(300).optional(),
  })
  .refine(v => Boolean(v.doi) || Boolean(v.title), {
    message: 'Provide at least a DOI or a title',
    path: ['doi'],
  });
