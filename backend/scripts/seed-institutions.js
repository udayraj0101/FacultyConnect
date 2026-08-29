import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Institution } from '../models/Institution.js';
import { VerificationRequest } from '../models/VerificationRequest.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');

const SEED = [
  {
    name: 'Indian Institute of Technology Madras',
    domain: 'iitm.ac.in',
    aisheCode: 'C-1435',
    verificationStatus: 'verified',
    subscriptionTier: 'paid',
  },
  {
    name: 'National Institute of Technology Tiruchirappalli',
    domain: 'nitt.edu',
    aisheCode: 'C-3286',
    verificationStatus: 'verified',
    subscriptionTier: 'free',
  },
  {
    name: 'Indian Institute of Science',
    domain: 'iisc.ac.in',
    aisheCode: 'C-1234',
    verificationStatus: 'verified',
    subscriptionTier: 'paid',
  },
  {
    name: 'Anna University',
    domain: 'annauniv.edu',
    aisheCode: 'U-0117',
    verificationStatus: 'pending',
    subscriptionTier: 'free',
  },
  {
    name: 'Vellore Institute of Technology',
    domain: 'vit.ac.in',
    aisheCode: 'U-0472',
    verificationStatus: 'pending',
    subscriptionTier: 'free',
  },
];

// For "pending" seeds we always want a clean testable state: reset the
// institution's status back to pending, delete any prior VerificationRequests
// for it, and create a fresh pending one. This makes the seed a reliable
// "reset the verification queue" tool.
async function run() {
  await connectDB();
  let inserted = 0;
  let requestsReset = 0;
  for (const doc of SEED) {
    const upsertResult = await Institution.updateOne(
      { domain: doc.domain },
      { $setOnInsert: doc },
      { upsert: true },
    );
    if (upsertResult.upsertedCount) inserted += 1;

    if (doc.verificationStatus !== 'pending') continue;

    const inst = await Institution.findOne({ domain: doc.domain });
    // Force-reset status back to pending in case a smoke test approved/rejected it.
    if (inst.verificationStatus !== 'pending') {
      inst.verificationStatus = 'pending';
      await inst.save();
    }
    // Wipe any old requests for this institution to guarantee a clean pending queue.
    await VerificationRequest.deleteMany({
      entityType: 'institution',
      entityId: inst._id,
    });
    await VerificationRequest.create({
      entityType: 'institution',
      entityId: inst._id,
      entityRefModel: 'Institution',
      submittedDocs: [`aishe-cert-${doc.aisheCode}.pdf`, 'ugc-affiliation.pdf'],
      status: 'pending',
    });
    requestsReset += 1;
  }
  const totalInsts = await Institution.countDocuments();
  const pendingReqs = await VerificationRequest.countDocuments({ status: 'pending' });
  logger.info('seed complete', {
    inserted,
    institutionsTotal: totalInsts,
    pendingRequestsAfter: pendingReqs,
    pendingSeedsReset: requestsReset,
  });
  process.exit(0);
}

run().catch(err => {
  logger.error('seed failed', { error: err.message });
  process.exit(1);
});
