import nodemailer from 'nodemailer';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('email');

/**
 * Thin email abstraction. In dev we log the message to console (no SMTP
 * needed). In prod, set EMAIL_TRANSPORT=smtp and provide EMAIL_HOST /
 * EMAIL_PORT / EMAIL_USER / EMAIL_PASS. Templates stay identical so we
 * can switch providers by changing env alone.
 */

const FROM = process.env.EMAIL_FROM || 'FacultyConnect <no-reply@facultyconnect.in>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Lazy transporter — instantiated once, reused for every send. Kept
// module-private so we don't accidentally spawn one per email.
let smtpTransporter = null;

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) {
    throw Object.assign(new Error('EMAIL_HOST, EMAIL_USER, EMAIL_PASS must be set for SMTP transport'), {
      code: 'SMTP_MISCONFIGURED',
    });
  }
  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS, anything else = STARTTLS (secure: false + upgrade).
    secure: port === 465,
    auth: { user, pass },
  });
  logger.info('smtp transporter initialised', { host, port, user });
  return smtpTransporter;
}

async function consoleTransport({ to, subject, text }) {
  logger.info('email (console transport)', {
    to,
    subject,
    from: FROM,
    preview: text?.slice(0, 200),
  });
  // eslint-disable-next-line no-console
  console.log('\n' + '━'.repeat(72));
  // eslint-disable-next-line no-console
  console.log(`  EMAIL  →  ${to}`);
  // eslint-disable-next-line no-console
  console.log(`  FROM   :  ${FROM}`);
  // eslint-disable-next-line no-console
  console.log(`  SUBJECT:  ${subject}`);
  // eslint-disable-next-line no-console
  console.log('─'.repeat(72));
  // eslint-disable-next-line no-console
  console.log(text);
  // eslint-disable-next-line no-console
  console.log('━'.repeat(72) + '\n');
  return { transport: 'console', accepted: [to] };
}

async function smtpTransport({ to, subject, text, html }) {
  const transporter = getSmtpTransporter();
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
  logger.info('email sent via smtp', {
    to,
    subject,
    messageId: info.messageId,
    response: info.response,
  });
  return { transport: 'smtp', accepted: info.accepted, messageId: info.messageId };
}

async function send({ to, subject, text, html }) {
  const transport = (process.env.EMAIL_TRANSPORT || 'console').toLowerCase();
  try {
    if (transport === 'smtp') return await smtpTransport({ to, subject, text, html });
    if (transport === 'console') return await consoleTransport({ to, subject, text, html });
    logger.warn('unknown EMAIL_TRANSPORT, falling back to console', { transport });
    return await consoleTransport({ to, subject, text, html });
  } catch (err) {
    // Never let email delivery break the parent action. Log loudly, but
    // return a rejected-like result so callers stay happy.
    logger.error('email send failed', { to, subject, transport, error: err.message });
    return { transport, error: err.message, rejected: [to] };
  }
}

// -------- Templates --------

export function sendFacultyInvite({ toEmail, toName, invitedByName, institutionName, token }) {
  const url = `${FRONTEND_URL}/onboarding/${encodeURIComponent(token)}`;
  const subject = `${invitedByName} invited you to join ${institutionName} on FacultyConnect`;
  const text = `Hi ${toName || 'there'},

${invitedByName} has added you to ${institutionName}'s faculty roster on FacultyConnect.

FacultyConnect is a discovery + collaboration platform for Indian faculty — verified FDPs, conferences, grants, and journal CFPs, plus a searchable peer directory.

Complete your onboarding here (link valid for 7 days):
  ${url}

You'll set a password and can optionally connect your ORCID iD to auto-populate your publication history.

If you weren't expecting this invitation, you can safely ignore this email.

— FacultyConnect
`;
  return send({ to: toEmail, subject, text });
}

export function sendApprovalNotification({ toEmail, toName, institutionName }) {
  const subject = `Your FacultyConnect account is verified at ${institutionName}`;
  const text = `Hi ${toName || 'there'},

Good news — the admin at ${institutionName} has verified your FacultyConnect account. You now appear as a verified member of ${institutionName} across the platform.

Sign in: ${FRONTEND_URL}/login

— FacultyConnect
`;
  return send({ to: toEmail, subject, text });
}

export function sendRejectionNotification({ toEmail, toName, institutionName, reason }) {
  const subject = `FacultyConnect: your affiliation with ${institutionName} was not approved`;
  const text = `Hi ${toName || 'there'},

The admin at ${institutionName} has reviewed your FacultyConnect signup and was unable to verify your affiliation with the institution.

${reason ? `Reason given: ${reason}` : ''}

You can still use FacultyConnect without an institutional affiliation, or contact the college admin directly to resolve this. If you believe this is a mistake, you can update your institution selection in your profile.

Sign in: ${FRONTEND_URL}/login

— FacultyConnect
`;
  return send({ to: toEmail, subject, text });
}
