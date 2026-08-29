import 'dotenv/config';
import { sendFacultyInvite } from '../services/email.service.js';

/**
 * Fire a single realistic-looking invite email to verify that SMTP is
 * configured correctly. Uses the faculty-invite template so we test both
 * the transport AND that our copy renders sensibly at the destination.
 *
 * Usage:
 *   node scripts/send-test-email.js you@example.com
 */
async function run() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/send-test-email.js <recipient@example.com>');
    process.exit(1);
  }

  console.log(`Transport: ${process.env.EMAIL_TRANSPORT || 'console'}`);
  console.log(`From:      ${process.env.EMAIL_FROM || 'FacultyConnect <no-reply@facultyconnect.in>'}`);
  console.log(`To:        ${to}\n`);

  const result = await sendFacultyInvite({
    toEmail: to,
    toName: 'Test Faculty',
    invitedByName: 'FacultyConnect Test Harness',
    institutionName: 'Test Institution',
    // Fake token — link won't work, that's fine for delivery testing.
    token: '000000000000000000000000.test-only-not-a-real-token',
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  if (result.error) {
    console.error('\n❌ Send failed — see error above. Check EMAIL_HOST/PORT/USER/PASS in .env.');
    process.exit(1);
  }
  console.log('\n✓ Sent. Check the inbox (and spam) at', to);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
