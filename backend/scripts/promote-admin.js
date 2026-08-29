import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('promote-admin');

async function run() {
  const email = (process.argv[2] || process.env.PROMOTE_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/promote-admin.js <email>');
    process.exit(1);
  }
  await connectDB();
  const faculty = await Faculty.findOneAndUpdate(
    { email },
    { role: 'PlatformAdmin' },
    { new: true },
  );
  if (!faculty) {
    logger.error('no faculty with that email', { email });
    process.exit(1);
  }
  logger.info('promoted to PlatformAdmin', { email, id: faculty._id.toString() });
  process.exit(0);
}

run().catch(err => {
  logger.error('failed', { error: err.message });
  process.exit(1);
});
