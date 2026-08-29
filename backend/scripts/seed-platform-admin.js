import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('seed');

const CREDS = {
  email: 'admin@facultyconnect.in',
  password: 'PlatformAdmin@2026',
  name: 'FacultyConnect Trust & Safety',
  designation: 'Professor',
};

async function run() {
  await connectDB();
  const passwordHash = await bcrypt.hash(CREDS.password, 12);
  const existing = await Faculty.findOne({ email: CREDS.email });
  let faculty;
  if (existing) {
    existing.name = CREDS.name;
    existing.designation = CREDS.designation;
    existing.role = 'PlatformAdmin';
    existing.passwordHash = passwordHash;
    existing.verificationStatus = 'verified';
    await existing.save();
    faculty = existing;
    logger.info('updated existing platform admin', { id: faculty._id.toString() });
  } else {
    faculty = await Faculty.create({
      name: CREDS.name,
      email: CREDS.email,
      passwordHash,
      role: 'PlatformAdmin',
      designation: CREDS.designation,
      verificationStatus: 'verified',
    });
    logger.info('created new platform admin', { id: faculty._id.toString() });
  }
  console.log('\n=== Platform Admin ready ===');
  console.log(`Email:    ${CREDS.email}`);
  console.log(`Password: ${CREDS.password}`);
  console.log(`Role:     PlatformAdmin`);
  console.log('============================\n');
  process.exit(0);
}

run().catch(err => {
  logger.error('failed', { error: err.message });
  process.exit(1);
});
