import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Opportunity } from '../models/Opportunity.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

const SEED = [
  {
    type: 'fdp',
    title: 'AICTE-ATAL FDP: Foundations of Generative AI for Engineering Faculty',
    description:
      'One-week AICTE-approved Faculty Development Programme covering transformer architectures, prompt engineering, and responsible deployment of generative AI in engineering education. Hands-on labs with open-weight models.',
    domainTags: ['Artificial Intelligence', 'Machine Learning', 'Educational Technology'],
    organizerName: 'IIT Madras',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(21),
    url: 'https://atalacademy.aicte-india.org/',
    verificationBadge: 'unverified',
  },
  {
    type: 'fdp',
    title: 'STTP: Advances in Sustainable Materials for Civil Infrastructure',
    description:
      'Five-day Short Term Training Programme on low-carbon concrete, recycled aggregates, and life-cycle assessment. Includes lab sessions at the host institution.',
    domainTags: ['Civil Engineering', 'Sustainable Materials'],
    organizerName: 'NIT Trichy',
    mode: 'offline',
    location: 'Tiruchirappalli, Tamil Nadu',
    cost: 3500,
    deadline: daysFromNow(35),
    verificationBadge: 'unverified',
  },
  {
    type: 'conference',
    title: 'IEEE INDICON 2026 — International Conference on Engineering, Science and Applications',
    description:
      'Flagship IEEE India Council conference. Tracks in AI, communications, power, VLSI, and interdisciplinary engineering. Proceedings indexed in IEEE Xplore and Scopus.',
    domainTags: ['Artificial Intelligence', 'Communications', 'VLSI', 'Power Systems'],
    organizerName: 'IEEE India Council',
    mode: 'hybrid',
    location: 'Bengaluru, Karnataka',
    cost: 8500,
    deadline: daysFromNow(60),
    url: 'https://indicon.ieeeindia.org/',
    verificationBadge: 'scopus_indexed',
  },
  {
    type: 'conference',
    title: 'ICLRD 2026 — International Conference on Language Resources and Digital Humanities',
    description:
      'Cross-disciplinary conference on corpus linguistics, NLP for low-resource Indian languages, and computational approaches to humanities scholarship.',
    domainTags: ['Natural Language Processing', 'Computational Linguistics', 'Digital Humanities'],
    organizerName: 'JNU School of Language, Literature & Culture Studies',
    mode: 'offline',
    location: 'New Delhi',
    cost: 4000,
    deadline: daysFromNow(45),
    verificationBadge: 'unverified',
  },
  {
    type: 'grant',
    title: 'SERB Core Research Grant 2026 — Engineering Sciences',
    description:
      'Anusandhan National Research Foundation (SERB) Core Research Grant for individual PIs. Up to Rs. 50 lakh over three years for basic and applied research in engineering sciences.',
    domainTags: ['Engineering Sciences', 'Basic Research'],
    organizerName: 'ANRF / SERB, Government of India',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(90),
    url: 'https://anrfonline.serbonline.in/',
    verificationBadge: 'unverified',
  },
  {
    type: 'grant',
    title: 'ICSSR Impactful Policy Research in Social Sciences (IMPRESS) — Cycle 2026',
    description:
      'Indian Council of Social Science Research grant for policy-oriented research. Priority areas: education policy, digital society, gender studies, and rural livelihoods.',
    domainTags: ['Social Sciences', 'Public Policy', 'Education Policy'],
    organizerName: 'ICSSR',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(75),
    verificationBadge: 'unverified',
  },
  {
    type: 'journal',
    title: 'Sadhana — Academy Proceedings in Engineering Sciences',
    description:
      'Peer-reviewed Springer journal of the Indian Academy of Sciences covering all branches of engineering. Bimonthly. UGC-CARE Group I and Scopus indexed.',
    domainTags: ['Engineering Sciences', 'Interdisciplinary'],
    organizerName: 'Indian Academy of Sciences / Springer',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(180),
    url: 'https://www.ias.ac.in/Journals/Sadhana/',
    issn: '0256-2499',
    verificationBadge: 'ugc_care_verified',
    indexing: ['scopus', 'ugc_care_i', 'wos_scie'],
    predatoryScreened: true,
    apc: { amount: 0, currency: 'INR', waiverAvailable: false, oaType: 'green' },
    lastVerifiedAgainstUgcCareOn: daysFromNow(-14),
  },
  {
    type: 'journal',
    title: 'Journal of the Indian Institute of Science',
    description:
      'Quarterly multidisciplinary journal from IISc Bengaluru, covering advances across the sciences and engineering. Peer-reviewed, Scopus indexed.',
    domainTags: ['Interdisciplinary', 'Sciences'],
    organizerName: 'Indian Institute of Science / Springer',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(120),
    issn: '0970-4140',
    verificationBadge: 'scopus_indexed',
    indexing: ['scopus', 'wos_esci'],
    predatoryScreened: true,
    apc: { amount: 0, currency: 'INR', waiverAvailable: true, oaType: 'hybrid' },
    lastVerifiedAgainstUgcCareOn: daysFromNow(-30),
  },
  {
    type: 'journal',
    title: 'IETE Journal of Research',
    description:
      'Taylor & Francis journal from the Institution of Electronics and Telecommunication Engineers, India. Covers electronics, telecom, computer engineering, information technology, and allied disciplines.',
    domainTags: ['Electronics', 'Telecommunications', 'Computer Engineering'],
    organizerName: 'IETE / Taylor & Francis',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(150),
    issn: '0377-2063',
    verificationBadge: 'scopus_indexed',
    indexing: ['scopus', 'wos_esci', 'ugc_care_ii'],
    predatoryScreened: true,
    apc: { amount: 250000, currency: 'INR', waiverAvailable: false, oaType: 'hybrid' },
    lastVerifiedAgainstUgcCareOn: daysFromNow(-45),
  },
  {
    type: 'journal',
    title: 'Journal of the Indian Society of Remote Sensing',
    description:
      'Springer journal on remote sensing, GIS, and photogrammetry with a strong Indian context. Peer-reviewed, quarterly.',
    domainTags: ['Remote Sensing', 'Geospatial', 'Earth Observation'],
    organizerName: 'Indian Society of Remote Sensing / Springer',
    mode: 'online',
    cost: 0,
    deadline: daysFromNow(90),
    issn: '0255-660X',
    verificationBadge: 'ugc_care_verified',
    indexing: ['scopus', 'ugc_care_i', 'wos_scie', 'doaj'],
    predatoryScreened: true,
    apc: { amount: 0, currency: 'INR', waiverAvailable: false, oaType: 'diamond' },
    lastVerifiedAgainstUgcCareOn: daysFromNow(-7),
  },
];

async function run() {
  await connectDB();
  const beforeCount = await Opportunity.countDocuments();
  logger.info('starting seed', { existingCount: beforeCount });

  let inserted = 0;
  let backfilled = 0;
  for (const doc of SEED) {
    // Backfill fields that were added after the initial seed (indexing,
    // predatoryScreened, apc) onto existing docs so `npm run seed:*`
    // stays the single source of demo truth. Fields that predate the
    // schema change ($setOnInsert) are only written on first insert to
    // preserve any admin edits.
    const setOnInsert = { ...doc, status: 'live' };
    const set = {};
    if (doc.indexing) set.indexing = doc.indexing;
    if (typeof doc.predatoryScreened === 'boolean') {
      set.predatoryScreened = doc.predatoryScreened;
    }
    if (doc.apc) set.apc = doc.apc;
    // Don't $setOnInsert and $set the same keys — Mongo rejects conflicts.
    for (const key of Object.keys(set)) delete setOnInsert[key];

    const update = { $setOnInsert: setOnInsert };
    if (Object.keys(set).length) update.$set = set;

    const result = await Opportunity.updateOne(
      { title: doc.title, organizerName: doc.organizerName },
      update,
      { upsert: true },
    );
    if (result.upsertedCount) inserted += 1;
    else if (result.modifiedCount) backfilled += 1;
  }
  const afterCount = await Opportunity.countDocuments();
  logger.info('seed complete', { inserted, backfilled, totalNow: afterCount });
  process.exit(0);
}

run().catch(err => {
  logger.error('seed failed', { error: err.message });
  process.exit(1);
});
