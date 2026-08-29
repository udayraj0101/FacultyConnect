import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Job } from '../models/Job.js';
import { Institution } from '../models/Institution.js';
import { Faculty } from '../models/Faculty.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

const JOB_TEMPLATES = [
  {
    title: 'Assistant Professor — Computer Science & Engineering (Applied ML)',
    department: 'Computer Science & Engineering',
    designation: 'Assistant',
    qualifications:
      'PhD in Computer Science, Statistics, or a closely related field. Strong publication record in machine learning, NLP, or systems ML. Teaching aptitude at UG and PG levels.',
    description:
      'The CSE department invites applications for a tenure-track Assistant Professor position. The successful candidate will teach core CS courses, build an externally funded research programme, and mentor PhD scholars in the AI/ML systems track.',
    domainTags: ['Machine Learning', 'Natural Language Processing', 'Systems'],
    location: 'Chennai, Tamil Nadu',
    experienceYears: 2,
    salaryDisclosed: 'AGP Rs. 1,01,500 (Level 12) as per 7th CPC',
    deadline: daysFromNow(45),
  },
  {
    title: 'Associate Professor — Electrical Engineering (Power Systems)',
    department: 'Electrical Engineering',
    designation: 'Associate',
    qualifications:
      'PhD in Electrical Engineering with focus on power systems, smart grid, or renewable energy integration. Minimum 6 years post-PhD experience with 15+ peer-reviewed publications.',
    description:
      'Associate Professor position with responsibilities across teaching, research, and administrative leadership. Candidate will co-lead the smart-grid lab and advise the department on curriculum modernization.',
    domainTags: ['Power Systems', 'Smart Grid', 'Renewable Energy'],
    location: 'Chennai, Tamil Nadu',
    experienceYears: 6,
    salaryDisclosed: 'AGP Rs. 1,39,600 (Level 13A) as per 7th CPC',
    deadline: daysFromNow(60),
  },
  {
    title: 'Guest Professor — School of Humanities & Social Sciences (Digital Humanities)',
    department: 'Humanities & Social Sciences',
    designation: 'Guest',
    qualifications:
      'PhD in Digital Humanities, Computational Linguistics, or a related interdisciplinary field. Prior teaching experience preferred.',
    description:
      'One-year visiting position to co-develop and deliver an elective sequence on computational methods for humanities scholarship. Reasonable teaching load with support for a small collaborative research project.',
    domainTags: ['Digital Humanities', 'Computational Linguistics'],
    location: 'Chennai, Tamil Nadu',
    experienceYears: 3,
    salaryDisclosed: 'Consolidated Rs. 1,00,000/month',
    deadline: daysFromNow(30),
  },
  {
    title: 'Research Scientist — Centre for Climate Change',
    department: 'Interdisciplinary Research Centre',
    designation: 'Research',
    qualifications:
      'PhD in Atmospheric Science, Climate Modelling, or Environmental Engineering. Programming proficiency in Python; experience with CMIP-style datasets.',
    description:
      'Three-year contract Research Scientist position with the Institute Centre for Climate Change. Contribute to sponsored projects on monsoon variability, downscaling for South Asia, and adaptation policy inputs to MoEFCC.',
    domainTags: ['Climate Science', 'Environmental Modelling'],
    location: 'Chennai, Tamil Nadu',
    experienceYears: 2,
    salaryDisclosed: 'Rs. 90,000/month (fixed) + HRA',
    deadline: daysFromNow(50),
  },
  {
    title: 'Professor — Metallurgical & Materials Engineering',
    department: 'Metallurgical & Materials Engineering',
    designation: 'Professor',
    qualifications:
      'PhD in Materials Engineering or closely related field. 10+ years post-PhD experience with sustained international recognition; strong record of PhD supervision and external funding.',
    description:
      'Senior professorial appointment. The candidate will provide research leadership in advanced materials for extreme environments, mentor early-career faculty, and represent the department on institute-level committees.',
    domainTags: ['Materials Science', 'Metallurgy'],
    location: 'Chennai, Tamil Nadu',
    experienceYears: 10,
    salaryDisclosed: 'AGP Rs. 1,82,200 (Level 14) as per 7th CPC',
    deadline: daysFromNow(90),
  },
];

async function run() {
  await connectDB();
  const inst = await Institution.findOne({ domain: 'iitm.ac.in' });
  if (!inst || inst.verificationStatus !== 'verified') {
    logger.error('IIT Madras institution not found or not verified — run seed:institutions first');
    process.exit(1);
  }
  const collegeAdmin = await Faculty.findOne({ email: 'admin@iitm.ac.in' });
  if (!collegeAdmin) {
    logger.error('IIT Madras college admin not found — run seed:college-admin first');
    process.exit(1);
  }

  let inserted = 0;
  for (const template of JOB_TEMPLATES) {
    const result = await Job.updateOne(
      { title: template.title, institutionId: inst._id },
      {
        $setOnInsert: {
          ...template,
          institutionId: inst._id,
          postedBy: collegeAdmin._id,
          status: 'open',
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
  }
  const total = await Job.countDocuments();
  logger.info('seed complete', { inserted, totalNow: total });
  process.exit(0);
}

run().catch(err => {
  logger.error('seed failed', { error: err.message });
  process.exit(1);
});
