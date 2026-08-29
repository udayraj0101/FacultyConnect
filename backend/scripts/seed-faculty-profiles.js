import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed-faculty-profiles');

/**
 * Enriches the three seeded demo faculty accounts with realistic profile
 * data: department, bio, employment history, education, awards, grants,
 * and external links. Idempotent — safe to re-run; it overwrites the
 * profile fields but leaves credentials / metrics / publications alone.
 *
 * Run: npm run seed:faculty-profiles
 */

const PROFILES = [
  {
    email: 'ananya.krishnan@iitm.ac.in',
    patch: {
      department: 'Computer Science and Engineering',
      phone: '+91 44 2257 4400',
      bio:
        'I lead the Language Learning Lab at IIT Madras, where we build NLP systems for low-resource Indian languages and evaluate their impact on classroom learning outcomes. Current focus: assistive reading tools for multilingual K-college learners and open evaluation benchmarks for Indic language models. Always open to collaborations at the intersection of ML, applied linguistics, and educational research.',
      employmentHistory: [
        {
          institution: 'Indian Institute of Technology Madras',
          designation: 'Associate Professor',
          from: 2021,
          to: null,
          current: true,
          description:
            'Founding PI of the Language Learning Lab. Teaching NLP, Deep Learning, and a graduate seminar on Responsible AI.',
        },
        {
          institution: 'Indian Institute of Technology Madras',
          designation: 'Assistant Professor',
          from: 2017,
          to: 2021,
          current: false,
          description: 'Set up the initial NLP research group; secured first DST-SERB grant.',
        },
        {
          institution: 'Microsoft Research India',
          designation: 'Postdoctoral Researcher',
          from: 2015,
          to: 2017,
          current: false,
          description:
            'Worked on transliteration and code-mixed language modelling in the Indian Languages group.',
        },
      ],
      education: [
        { degree: 'Ph.D.', field: 'Computer Science', institution: 'Indian Institute of Science, Bangalore', year: 2015 },
        { degree: 'M.Tech', field: 'Computer Science', institution: 'Indian Institute of Technology Bombay', year: 2010 },
        { degree: 'B.E.', field: 'Computer Science and Engineering', institution: 'College of Engineering, Anna University', year: 2008 },
      ],
      awards: [
        {
          title: 'INSA Young Scientist Award',
          year: 2022,
          description: 'For contributions to NLP for Indian languages, awarded by the Indian National Science Academy.',
        },
        {
          title: 'Best Paper Award, NAACL 2020',
          year: 2020,
          description: 'For "Evaluating Transliteration Systems on Real-World Code-Mixed Text".',
        },
        {
          title: 'IIT Madras Institute Research Excellence Award',
          year: 2023,
          description: 'Annual institute-level recognition for early-career research impact.',
        },
      ],
      grantsReceived: [
        {
          title: 'Open Benchmarks for Indic Language Models',
          agency: 'MeitY — National Language Translation Mission',
          role: 'PI',
          amount: 12500000,
          year: 2024,
          ongoing: true,
        },
        {
          title: 'Assistive Reading Tools for Multilingual Learners',
          agency: 'DST-SERB Core Research Grant',
          role: 'PI',
          amount: 4800000,
          year: 2022,
          ongoing: true,
        },
        {
          title: 'Speech-to-Text for Low-Resource Indian Dialects',
          agency: 'DST-SERB Early Career Research',
          role: 'PI',
          amount: 2400000,
          year: 2019,
          ongoing: false,
        },
      ],
      externalLinks: {
        website: 'https://ananyakrishnan.in',
        linkedin: 'https://linkedin.com/in/ananya-krishnan',
        googleScholar: 'https://scholar.google.com/citations?user=demo-ananya',
        github: 'https://github.com/ananyakrishnan',
        twitter: 'https://x.com/ananyakr',
      },
    },
  },

  {
    email: 'rajesh.iyer@nitt.edu',
    patch: {
      department: 'Electrical and Electronics Engineering',
      phone: '+91 431 250 3000',
      bio:
        'Full Professor at NIT Trichy working on smart grids, distribution-level renewable integration, and grid resilience under high-penetration solar. I run the Power Systems Simulation Lab and teach graduate courses in power system dynamics and optimization. Actively collaborate with state DISCOMs on real-world pilots.',
      employmentHistory: [
        {
          institution: 'National Institute of Technology Tiruchirappalli',
          designation: 'Professor',
          from: 2016,
          to: null,
          current: true,
          description: 'Heads the Power Systems Simulation Lab; PhD supervision (7 completed, 4 ongoing).',
        },
        {
          institution: 'National Institute of Technology Tiruchirappalli',
          designation: 'Associate Professor',
          from: 2010,
          to: 2016,
          current: false,
        },
        {
          institution: 'Anna University',
          designation: 'Reader',
          from: 2005,
          to: 2010,
          current: false,
          description: 'Taught power systems and electrical machines to UG and PG cohorts.',
        },
      ],
      education: [
        { degree: 'Ph.D.', field: 'Electrical Engineering', institution: 'Indian Institute of Technology Delhi', year: 2005 },
        { degree: 'M.Tech', field: 'Power Systems', institution: 'Indian Institute of Technology Kanpur', year: 1999 },
        { degree: 'B.E.', field: 'Electrical and Electronics Engineering', institution: 'PSG College of Technology', year: 1997 },
      ],
      awards: [
        {
          title: 'IEEE PES Outstanding Educator Award (India Chapter)',
          year: 2021,
          description: 'Recognizing sustained contribution to power engineering education.',
        },
        {
          title: 'NITT Best Researcher Award',
          year: 2019,
          description: 'Institute-level award for research output and student mentorship.',
        },
      ],
      grantsReceived: [
        {
          title: 'Resilience Assessment of Solar-Rich Distribution Feeders',
          agency: 'MNRE — Ministry of New and Renewable Energy',
          role: 'PI',
          amount: 8500000,
          year: 2023,
          ongoing: true,
        },
        {
          title: 'AI-Assisted Fault Localization in Smart Grids',
          agency: 'DST-SERB Core Research Grant',
          role: 'PI',
          amount: 5200000,
          year: 2021,
          ongoing: true,
        },
        {
          title: 'EV Charging Impact on Urban Distribution Networks',
          agency: 'Tamil Nadu Electricity Board (Industry)',
          role: 'Co-PI',
          amount: 3000000,
          year: 2020,
          ongoing: false,
        },
      ],
      externalLinks: {
        website: 'https://nitt.edu/home/academics/departments/eee/faculty/rajesh-iyer',
        linkedin: 'https://linkedin.com/in/rajesh-iyer-nitt',
        googleScholar: 'https://scholar.google.com/citations?user=demo-rajesh',
        github: '',
        twitter: '',
      },
    },
  },

  {
    email: 'priya.menon@iisc.ac.in',
    patch: {
      department: 'Centre for Atmospheric and Oceanic Sciences',
      phone: '+91 80 2293 2505',
      bio:
        'Early-career researcher working on monsoon predictability and regional climate modelling for the Indian subcontinent. My group uses a mix of high-resolution numerical models and observational data assimilation to understand extreme rainfall events. Looking for collaborators in atmospheric chemistry and ML-based downscaling.',
      employmentHistory: [
        {
          institution: 'Indian Institute of Science, Bangalore',
          designation: 'Assistant Professor',
          from: 2023,
          to: null,
          current: true,
          description: 'Building a regional climate modelling group at CAOS.',
        },
        {
          institution: 'National Center for Atmospheric Research (NCAR), Boulder',
          designation: 'Postdoctoral Fellow',
          from: 2020,
          to: 2023,
          current: false,
          description: 'Worked with the Climate and Global Dynamics Lab on CESM ensemble experiments.',
        },
      ],
      education: [
        { degree: 'Ph.D.', field: 'Atmospheric Sciences', institution: 'Indian Institute of Technology Bombay', year: 2020 },
        { degree: 'M.Sc.', field: 'Physics', institution: 'Tata Institute of Fundamental Research', year: 2014 },
        { degree: 'B.Sc.', field: 'Physics', institution: "St. Xavier's College, Mumbai", year: 2012 },
      ],
      awards: [
        {
          title: 'DST INSPIRE Faculty Fellowship',
          year: 2023,
          description: 'Five-year independent research fellowship for early-career scientists.',
        },
        {
          title: 'Best Poster, AGU Fall Meeting',
          year: 2019,
          description: 'For work on Indian summer monsoon variability under warming scenarios.',
        },
      ],
      grantsReceived: [
        {
          title: 'High-Resolution Climate Projections for Peninsular India',
          agency: 'Ministry of Earth Sciences (MoES)',
          role: 'PI',
          amount: 4500000,
          year: 2024,
          ongoing: true,
        },
        {
          title: 'DST INSPIRE Faculty Grant',
          agency: 'DST-INSPIRE',
          role: 'PI',
          amount: 3500000,
          year: 2023,
          ongoing: true,
        },
      ],
      externalLinks: {
        website: '',
        linkedin: 'https://linkedin.com/in/priya-menon-caos',
        googleScholar: 'https://scholar.google.com/citations?user=demo-priya',
        github: '',
        twitter: '',
      },
    },
  },
];

async function run() {
  await connectDB();

  let updated = 0;
  let missing = 0;

  for (const { email, patch } of PROFILES) {
    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      logger.warn('faculty not found — run seed:demo-accounts first', { email });
      missing += 1;
      continue;
    }
    Object.assign(faculty, patch);
    await faculty.save();
    updated += 1;
    logger.info('profile enriched', { email });
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       FACULTY PROFILES — sample data seeded                      ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  for (const { email } of PROFILES) {
    console.log(`║   ${email.padEnd(60)}   ║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║   Updated: ${String(updated).padEnd(3)}   Missing: ${String(missing).padEnd(3)}   Password: Faculty@2026  ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(0);
}

run().catch(err => {
  logger.error('seed failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
