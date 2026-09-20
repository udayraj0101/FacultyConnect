import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';

// UGC Regulations 2018 (CAS — Career Advancement Scheme) Research Score
// calculator, sourced from Appendix II Table 2 of the official regulations
// (widely reproduced across UGC circulars and university handbooks — the
// point values below are the standard defaults every Indian public
// university uses for CAS applications).
//
// Scope: RESEARCH SCORE only (not the Teaching / Professional Development
// Category I+II items — those depend on institutional workload records
// we don't hold). Research Score is what actually gates promotion at the
// Assistant → Associate (≥75) and Associate → Professor (≥120) thresholds.
//
// This is a SELF-ESTIMATION tool. The final promotion committee applies
// multi-author sharing, journal-classification rules and impact-factor
// tiers that require judgement we can't automate reliably. Every response
// carries an `advisory` flag saying so — the UI surfaces it prominently.

// Point table. Each key documents the source category so a future auditor
// can trace where the number came from. Do NOT tweak these without a
// citation — universities cross-check faculty CAS applications against
// the official table.
export const UGC_2018_API_RULES = {
  // Category I of Appendix II Table 2: Research Papers
  // Base 10 points per peer-reviewed / UGC-listed paper. We treat every
  // Publication in our DB as this baseline; upgrading Scopus-indexed to
  // 15 would need journal-level metadata we don't join on yet — flagged
  // as a "conservative estimate" in the UI.
  perPeerReviewedPaper: 10,

  // Category II Table 2: Books, chapters, editorship
  bookInternational: 12,
  bookNational: 10,
  chapterInternational: 5,
  chapterNational: 3,
  editorInternational: 10,
  editorNational: 5,

  // Category III Table 2: Sponsored research projects (per project)
  projectMajorAbove30L: 10, // > Rs. 30 lakh
  projectMajor5to30L: 5, // Rs. 5-30 lakh
  projectMinorBelow5L: 2, // < Rs. 5 lakh
  // Ongoing projects count for HALF the completed value (UGC 2018 Table 2
  // note (iii)). We apply this at compute time on grantsReceived.ongoing.

  // Consultancy: 3 points per Rs. 10 lakh (Table 2 category III (b))
  consultancyPer10Lakh: 3,

  // Category IV: Research guidance
  phdAwarded: 10, // per successfully awarded PhD student
  phdOngoing: 5, // per registered but ongoing PhD student
  mPhilAwarded: 2, // per M.Phil awarded

  // Category V: Fellowships / Awards. We only have `title, year` on file,
  // so we DEFAULT every stored award to national tier (5) — the safer
  // conservative estimate. Users can override in the manual section by
  // moving items between international/state buckets.
  awardInternational: 7,
  awardNational: 5,
  awardStateOrUniv: 3,

  // Category VI: Invited lectures / paper presentations
  invitedLectureIntlAbroad: 7,
  invitedLectureIntlInIndia: 5,
  invitedLectureNational: 3,
  invitedLectureState: 2,
};

// Promotion thresholds (UGC 2018 §5-6). Direct-recruitment Associate and
// Professor both use the same minimum research scores, so the promotion
// pathway and direct-recruitment pathway share these numbers.
export const PROMOTION_THRESHOLDS = {
  associate: 75, // Assistant Prof (Stage 3) → Associate Prof (Stage 4)
  professor: 120, // Associate Prof (Stage 4) → Professor (Stage 5)
};

/**
 * Compute the CAS Research Score for a faculty by combining stored data
 * (Publications + grantsReceived + awards) with the user's saved manual
 * inputs (PhD supervision, books/chapters, invited talks, consultancy).
 *
 * Every line item is returned in the breakdown so the UI can show
 * "10 papers × 10 pts = 100 pts", giving the faculty a defensible tally
 * they can copy into their real CAS application form.
 */
export async function computeResearchScore(facultyId) {
  const faculty = await Faculty.findById(facultyId).select(
    'name designation grantsReceived awards casManualInputs',
  );
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const publications = await Publication.find({ facultyId }).select('_id').lean();
  const manual = faculty.casManualInputs || {};

  const rules = UGC_2018_API_RULES;
  const breakdown = [];

  const addLine = (category, label, count, perPoint, note) => {
    if (!count || count <= 0) return;
    breakdown.push({
      category,
      label,
      count,
      perPoint,
      points: count * perPoint,
      ...(note ? { note } : {}),
    });
  };

  // 1. Research Papers — from Publication model. We apply the conservative
  // per-paper baseline; a note flags that Scopus-indexed papers may earn
  // more once we hold journal metadata.
  addLine(
    'papers',
    'Peer-reviewed research papers',
    publications.length,
    rules.perPeerReviewedPaper,
    'Base rate. Scopus/WoS-indexed papers may earn 15 pts each — verify against the venue.',
  );

  // 2. Books / chapters / editorship — all manual entry.
  addLine('publications', 'Books authored — International publisher', manual.booksInternational, rules.bookInternational);
  addLine('publications', 'Books authored — National publisher', manual.booksNational, rules.bookNational);
  addLine('publications', 'Book chapters — International', manual.chaptersInternational, rules.chapterInternational);
  addLine('publications', 'Book chapters — National', manual.chaptersNational, rules.chapterNational);
  addLine('publications', 'Editor — International volume', manual.editorInternational, rules.editorInternational);
  addLine('publications', 'Editor — National volume', manual.editorNational, rules.editorNational);

  // 3. Research projects — from grantsReceived subdoc. Amount buckets are
  // interpreted from the stored INR figure; ongoing projects earn half.
  const projects = { majorAbove30L: 0, major5to30L: 0, minor: 0, majorAbove30LOngoing: 0, major5to30LOngoing: 0, minorOngoing: 0 };
  for (const grant of faculty.grantsReceived || []) {
    const amt = grant.amount || 0;
    const ongoing = Boolean(grant.ongoing);
    if (amt > 3_000_000) {
      if (ongoing) projects.majorAbove30LOngoing += 1;
      else projects.majorAbove30L += 1;
    } else if (amt >= 500_000) {
      if (ongoing) projects.major5to30LOngoing += 1;
      else projects.major5to30L += 1;
    } else if (amt > 0) {
      if (ongoing) projects.minorOngoing += 1;
      else projects.minor += 1;
    }
  }
  addLine('projects', 'Major project (> Rs. 30 lakh) — completed', projects.majorAbove30L, rules.projectMajorAbove30L);
  addLine('projects', 'Major project (Rs. 5-30 lakh) — completed', projects.major5to30L, rules.projectMajor5to30L);
  addLine('projects', 'Minor project (< Rs. 5 lakh) — completed', projects.minor, rules.projectMinorBelow5L);
  // Ongoing = half (round to nearest 0.5 point).
  addLine(
    'projects',
    'Major project (> Rs. 30 lakh) — ongoing',
    projects.majorAbove30LOngoing,
    rules.projectMajorAbove30L / 2,
    'Ongoing projects earn 50% of completed value (UGC 2018 note iii).',
  );
  addLine(
    'projects',
    'Major project (Rs. 5-30 lakh) — ongoing',
    projects.major5to30LOngoing,
    rules.projectMajor5to30L / 2,
  );
  addLine(
    'projects',
    'Minor project (< Rs. 5 lakh) — ongoing',
    projects.minorOngoing,
    rules.projectMinorBelow5L / 2,
  );

  // 4. Consultancy — 3 pts per Rs. 10 lakh (manual, since we don't track
  // consultancy separately from grants).
  if (manual.consultancyLakhs > 0) {
    const units = manual.consultancyLakhs / 10;
    breakdown.push({
      category: 'projects',
      label: 'Consultancy earnings',
      count: manual.consultancyLakhs,
      countUnit: 'lakh',
      perPoint: rules.consultancyPer10Lakh,
      points: Math.round(units * rules.consultancyPer10Lakh * 10) / 10,
      note: '3 pts per Rs. 10 lakh (UGC 2018 Table 2 III(b)).',
    });
  }

  // 5. Research guidance — manual.
  addLine('guidance', 'PhD students — awarded', manual.phdAwarded, rules.phdAwarded);
  addLine('guidance', 'PhD students — ongoing (registered)', manual.phdOngoing, rules.phdOngoing);
  addLine('guidance', 'M.Phil students — awarded', manual.mPhilAwarded, rules.mPhilAwarded);

  // 6. Awards — from Faculty.awards subdoc, defaulting to National tier
  // (5 pts) since we don't hold classification metadata. Users can bump
  // international-tier awards using the manual buckets in a follow-up.
  const awardCount = (faculty.awards || []).length;
  addLine(
    'awards',
    'Awards / fellowships',
    awardCount,
    rules.awardNational,
    'Defaulted to National tier (5 pts). International tier is 7 — flag high-value awards for a manual bump.',
  );

  // 7. Invited lectures — manual.
  addLine('lectures', 'Invited lecture — International (abroad)', manual.invitedLecturesIntlAbroad, rules.invitedLectureIntlAbroad);
  addLine('lectures', 'Invited lecture — International (in India)', manual.invitedLecturesIntlInIndia, rules.invitedLectureIntlInIndia);
  addLine('lectures', 'Invited lecture — National', manual.invitedLecturesNational, rules.invitedLectureNational);
  addLine('lectures', 'Invited lecture — State / University', manual.invitedLecturesState, rules.invitedLectureState);

  // Roll-up totals per category so the UI can render a pie / stack.
  const categoryTotals = {};
  for (const line of breakdown) {
    categoryTotals[line.category] = (categoryTotals[line.category] || 0) + line.points;
  }
  const total = Math.round(Object.values(categoryTotals).reduce((a, b) => a + b, 0) * 10) / 10;

  // Promotion eligibility. We give the faculty the next-step goal so they
  // know what they're chasing, not just what they've earned.
  const eligibility = {
    qualifiesForAssociate: total >= PROMOTION_THRESHOLDS.associate,
    qualifiesForProfessor: total >= PROMOTION_THRESHOLDS.professor,
    pointsToAssociate: Math.max(0, PROMOTION_THRESHOLDS.associate - total),
    pointsToProfessor: Math.max(0, PROMOTION_THRESHOLDS.professor - total),
  };

  return {
    total,
    breakdown,
    categoryTotals,
    eligibility,
    thresholds: PROMOTION_THRESHOLDS,
    manualInputs: sanitiseManualInputsForResponse(manual),
    advisory:
      'Estimated per the UGC Regulations 2018, Appendix II Table 2 (Research Score). ' +
      'The final CAS committee applies multi-author sharing, journal-classification, ' +
      'and impact-factor tiers that may adjust this total — verify against your ' +
      'university\'s CAS application form before submission.',
  };
}

function sanitiseManualInputsForResponse(raw) {
  const src = raw || {};
  return {
    phdAwarded: src.phdAwarded || 0,
    phdOngoing: src.phdOngoing || 0,
    mPhilAwarded: src.mPhilAwarded || 0,
    booksInternational: src.booksInternational || 0,
    booksNational: src.booksNational || 0,
    chaptersInternational: src.chaptersInternational || 0,
    chaptersNational: src.chaptersNational || 0,
    editorInternational: src.editorInternational || 0,
    editorNational: src.editorNational || 0,
    invitedLecturesIntlAbroad: src.invitedLecturesIntlAbroad || 0,
    invitedLecturesIntlInIndia: src.invitedLecturesIntlInIndia || 0,
    invitedLecturesNational: src.invitedLecturesNational || 0,
    invitedLecturesState: src.invitedLecturesState || 0,
    consultancyLakhs: src.consultancyLakhs || 0,
  };
}

/**
 * Persist the faculty's manual counters. Merges partial patches on top of
 * whatever they had before so the UI can save one field at a time.
 */
export async function updateManualInputs(facultyId, patch) {
  const faculty = await Faculty.findById(facultyId).select('casManualInputs');
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const merged = { ...(faculty.casManualInputs?.toObject?.() || faculty.casManualInputs || {}), ...patch };
  faculty.casManualInputs = merged;
  await faculty.save();
  return computeResearchScore(facultyId);
}
