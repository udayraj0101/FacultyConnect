import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');

const CREDS = {
  email: 'admin@iitm.ac.in',
  password: 'CollegeAdmin@2026',
  name: 'Prof. R. Ganesh (Dean of Faculty Affairs)',
  designation: 'Professor',
  institutionDomain: 'iitm.ac.in',
};

async function run() {
  await connectDB();

  const inst = await Institution.findOne({ domain: CREDS.institutionDomain });
  if (!inst) {
    logger.error('institution missing — run `npm run seed:institutions` first', {
      domain: CREDS.institutionDomain,
    });
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(CREDS.password, 12);
  const existing = await Faculty.findOne({ email: CREDS.email });
  let faculty;
  if (existing) {
    existing.name = CREDS.name;
    existing.designation = CREDS.designation;
    existing.role = 'CollegeAdmin';
    existing.institutionId = inst._id;
    existing.passwordHash = passwordHash;
    existing.verificationStatus = 'verified';
    await existing.save();
    faculty = existing;
    logger.info('updated existing college admin', { id: faculty._id.toString() });
  } else {
    faculty = await Faculty.create({
      name: CREDS.name,
      email: CREDS.email,
      passwordHash,
      role: 'CollegeAdmin',
      designation: CREDS.designation,
      institutionId: inst._id,
      verificationStatus: 'verified',
    });
    logger.info('created new college admin', { id: faculty._id.toString() });
  }

  console.log('\n=== College Admin ready ===');
  console.log(`Email:    ${CREDS.email}`);
  console.log(`Password: ${CREDS.password}`);
  console.log(`Role:     CollegeAdmin`);
  console.log(`Linked:   ${inst.name} (${inst.domain}) — ${inst.verificationStatus}`);
  console.log('===========================\n');
  process.exit(0);
}

run().catch(err => {
  logger.error('failed', { error: err.message });
  process.exit(1);
});
