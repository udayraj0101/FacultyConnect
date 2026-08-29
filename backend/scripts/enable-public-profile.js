import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { generateUniqueHandle } from '../services/publicHandle.service.js';

/**
 * Ad-hoc helper: enable the public profile toggle for a faculty by
 * email, generating a vanity handle if one isn't already set.
 *
 * Usage: node scripts/enable-public-profile.js <email>
 */
async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/enable-public-profile.js <email>');
    process.exit(1);
  }
  await connectDB();
  const faculty = await Faculty.findOne({ email: email.toLowerCase() });
  if (!faculty) {
    console.error(`No faculty found with email ${email}`);
    process.exit(1);
  }
  faculty.publicProfileEnabled = true;
  if (!faculty.publicHandle) {
    faculty.publicHandle = await generateUniqueHandle(faculty.name, faculty._id);
  }
  await faculty.save();
  console.log(
    `Enabled public profile for ${faculty.name}\n  id: ${faculty._id}\n  handle: ${faculty.publicHandle}\n  URL: /f/${faculty.publicHandle}`,
  );
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
