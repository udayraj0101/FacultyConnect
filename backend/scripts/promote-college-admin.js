import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Faculty } from '../models/Faculty.js';
import { Institution } from '../models/Institution.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('promote-college-admin');

function parseArgs() {
  const args = { email: null, domain: null };
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg === '--email') args.email = process.argv[++i];
    else if (arg === '--domain') args.domain = process.argv[++i];
    else if (!args.email) args.email = arg;
  }
  return args;
}

async function run() {
  const { email, domain } = parseArgs();
  if (!email || !domain) {
    console.error('Usage: node scripts/promote-college-admin.js --email <email> --domain <institution-domain>');
    process.exit(1);
  }
  await connectDB();
  const inst = await Institution.findOne({ domain: domain.toLowerCase() });
  if (!inst) {
    logger.error('institution not found', { domain });
    process.exit(1);
  }
  const faculty = await Faculty.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: 'CollegeAdmin', institutionId: inst._id },
    { new: true },
  );
  if (!faculty) {
    logger.error('no faculty with that email', { email });
    process.exit(1);
  }
  logger.info('promoted to CollegeAdmin', {
    email,
    facultyId: faculty._id.toString(),
    institution: inst.name,
    institutionId: inst._id.toString(),
  });
  process.exit(0);
}

run().catch(err => {
  logger.error('failed', { error: err.message });
  process.exit(1);
});
