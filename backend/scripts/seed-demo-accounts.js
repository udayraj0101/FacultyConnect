import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { Publication } from '../models/Publication.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');

const DEMO = {
  facultyPassword: 'Faculty@2026',
  collegeAdminPassword: 'CollegeAdmin@2026',
  platformAdminPassword: 'PlatformAdmin@2026',

  faculty: [
    {
      email: 'ananya.krishnan@iitm.ac.in',
      name: 'Dr. Ananya Krishnan',
      designation: 'Associate',
      institutionDomain: 'iitm.ac.in',
      domainTags: ['Machine Learning', 'Natural Language Processing', 'Educational Technology'],
      orcidId: '0000-0002-1825-0097',
      citationCount: 1284,
      hIndex: 18,
      i10Index: 27,
      directoryVisible: true,
    },
    {
      email: 'rajesh.iyer@nitt.edu',
      name: 'Dr. Rajesh Iyer',
      designation: 'Professor',
      institutionDomain: 'nitt.edu',
      domainTags: ['Power Systems', 'Smart Grid', 'Renewable Energy'],
      citationCount: 2140,
      hIndex: 24,
      i10Index: 41,
      directoryVisible: true,
    },
    {
      email: 'priya.menon@iisc.ac.in',
      name: 'Dr. Priya Menon',
      designation: 'Assistant',
      institutionDomain: 'iisc.ac.in',
      domainTags: ['Climate Science', 'Atmospheric Modelling'],
      citationCount: 340,
      hIndex: 9,
      i10Index: 12,
      directoryVisible: true,
    },
    {
      email: 'newbie.faculty@example.edu',
      name: 'Dr. Newbie Faculty',
      designation: 'Assistant',
      institutionDomain: null,
      domainTags: [],
      directoryVisible: false,
    },
  ],

  collegeAdmins: [
    {
      email: 'admin@iitm.ac.in',
      name: 'Prof. R. Ganesh (Dean of Faculty Affairs)',
      designation: 'Professor',
      institutionDomain: 'iitm.ac.in',
    },
    {
      email: 'admin@iisc.ac.in',
      name: 'Prof. K. Subramanian (Registrar)',
      designation: 'Professor',
      institutionDomain: 'iisc.ac.in',
    },
    {
      email: 'admin@nitt.edu',
      name: 'Prof. S. Meenakshi (Director)',
      designation: 'Professor',
      institutionDomain: 'nitt.edu',
    },
  ],

  platformAdmins: [
    {
      email: 'admin@facultyconnect.in',
      name: 'FacultyConnect Trust & Safety',
      designation: 'Professor',
    },
    {
      email: 'trustandsafety@facultyconnect.in',
      name: 'T&S Reviewer',
      designation: 'Professor',
    },
  ],
};

async function upsertFaculty({ email, name, designation, role, passwordHash, institutionDomain, extra = {} }) {
  const inst = institutionDomain
    ? await Institution.findOne({ domain: institutionDomain })
    : null;
  const doc = {
    name,
    designation,
    role,
    passwordHash,
    verificationStatus: 'verified',
    institutionId: inst?._id || null,
    ...extra,
  };
  const existing = await Faculty.findOne({ email });
  if (existing) {
    Object.assign(existing, doc);
    await existing.save();
    return { faculty: existing, created: false };
  }
  const faculty = await Faculty.create({ email, ...doc });
  return { faculty, created: true };
}

async function run() {
  await connectDB();

  const facultyHash = await bcrypt.hash(DEMO.facultyPassword, 12);
  const caHash = await bcrypt.hash(DEMO.collegeAdminPassword, 12);
  const paHash = await bcrypt.hash(DEMO.platformAdminPassword, 12);

  let created = 0;
  let updated = 0;

  for (const f of DEMO.faculty) {
    const { created: isNew } = await upsertFaculty({
      email: f.email,
      name: f.name,
      designation: f.designation,
      role: 'Faculty',
      passwordHash: facultyHash,
      institutionDomain: f.institutionDomain,
      extra: {
        domainTags: f.domainTags || [],
        orcidId: f.orcidId || null,
        citationCount: f.citationCount || 0,
        hIndex: f.hIndex || 0,
        i10Index: f.i10Index || 0,
        directoryVisible: Boolean(f.directoryVisible),
      },
    });
    isNew ? (created += 1) : (updated += 1);
  }

  for (const c of DEMO.collegeAdmins) {
    const { created: isNew } = await upsertFaculty({
      email: c.email,
      name: c.name,
      designation: c.designation,
      role: 'CollegeAdmin',
      passwordHash: caHash,
      institutionDomain: c.institutionDomain,
    });
    isNew ? (created += 1) : (updated += 1);
  }

  for (const p of DEMO.platformAdmins) {
    const { created: isNew } = await upsertFaculty({
      email: p.email,
      name: p.name,
      designation: p.designation,
      role: 'PlatformAdmin',
      passwordHash: paHash,
      institutionDomain: null,
    });
    isNew ? (created += 1) : (updated += 1);
  }

  const totalPubs = await Publication.countDocuments();

  logger.info('demo accounts seeded', { created, updated, totalPublications: totalPubs });

  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    DEMO CREDENTIALS — ready to use                     ║');
  console.log('╠════════════════════════════════════════════════════════════════════════╣');
  console.log('║  PLATFORM ADMINS  (password: PlatformAdmin@2026)                       ║');
  console.log('╠════════════════════════════════════════════════════════════════════════╣');
  DEMO.platformAdmins.forEach(p => {
    console.log(`║   ${p.email.padEnd(50)}  ${p.name.slice(0, 15).padEnd(15)}  ║`);
  });
  console.log('╠════════════════════════════════════════════════════════════════════════╣');
  console.log('║  COLLEGE ADMINS   (password: CollegeAdmin@2026)                        ║');
  console.log('╠════════════════════════════════════════════════════════════════════════╣');
  for (const c of DEMO.collegeAdmins) {
    console.log(`║   ${c.email.padEnd(50)}  ${(c.institutionDomain || '').padEnd(15)}  ║`);
  }
  console.log('╠════════════════════════════════════════════════════════════════════════╣');
  console.log('║  FACULTY          (password: Faculty@2026)                             ║');
  console.log('╠════════════════════════════════════════════════════════════════════════╣');
  for (const f of DEMO.faculty) {
    console.log(`║   ${f.email.padEnd(50)}  ${(f.institutionDomain || '(no institution)').padEnd(15)}  ║`);
  }
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(0);
}

run().catch(err => {
  logger.error('seed failed', { error: err.message });
  process.exit(1);
});
