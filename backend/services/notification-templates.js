import { createLogger } from '../utils/logger.js';

const logger = createLogger('notification-templates');

// Central template registry. Each type renders BOTH the in-app card AND
// the email from the same payload, so a writer can eyeball parity
// (title/subject, body/text) in one place. To add a new notification
// type: add an entry here and call notify(recipient, type, payload)
// from the emitting service — no other wiring required.
//
// email: null means "in-app only". Used for high-frequency, low-signal
// events (invitation-accepted, connect-request-declined) where email
// would be noise.

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
}

const templates = {
  connect_request_received: {
    inApp: ({ fromName, purpose }) => ({
      title: `${fromName || 'A faculty member'} wants to connect`,
      body: purpose ? `Purpose: ${purpose}` : 'They sent you a connect request on FacultyConnect.',
      link: '/requests',
    }),
    email: ({ fromName, fromInstitution, purpose, message }, recipient) => ({
      subject: `${fromName || 'A faculty member'} wants to connect with you on FacultyConnect`,
      text: `Hi ${recipient.name || 'there'},

${fromName || 'A faculty member'}${fromInstitution ? ` from ${fromInstitution}` : ''} sent you a connect request on FacultyConnect.

${purpose ? `Purpose: ${purpose}\n` : ''}${message ? `Their message:\n"${message}"\n` : ''}
Review the request:
  ${frontendUrl()}/requests

Their contact stays hidden until you accept.

— FacultyConnect
`,
    }),
  },

  connect_request_accepted: {
    inApp: ({ toName }) => ({
      title: `${toName || 'A faculty member'} accepted your connect request`,
      body: 'You can now see their contact on their directory profile.',
      link: '/requests?direction=sent',
    }),
    email: ({ toName, toInstitution }, recipient) => ({
      subject: `${toName || 'A faculty member'} accepted your FacultyConnect request`,
      text: `Hi ${recipient.name || 'there'},

${toName || 'A faculty member'}${toInstitution ? ` at ${toInstitution}` : ''} accepted your connect request on FacultyConnect. Their contact is now visible on their directory profile.

Open the request:
  ${frontendUrl()}/requests?direction=sent

— FacultyConnect
`,
    }),
  },

  connect_request_declined: {
    inApp: ({ toName }) => ({
      title: `${toName || 'A faculty member'} declined your connect request`,
      body: 'Their profile stays public — you can try again with a different note.',
      link: '/requests?direction=sent',
    }),
    // Declines stay in-app only. Emailing a rejection makes the recipient
    // feel obliged to explain what should be a routine decision.
    email: null,
  },

  application_status_changed: {
    inApp: ({ jobTitle, institutionName, status }) => ({
      title: `Your application status changed to ${status}`,
      body: `${jobTitle}${institutionName ? ` at ${institutionName}` : ''}`,
      link: '/jobs',
    }),
    email: ({ jobTitle, institutionName, status }, recipient) => ({
      subject: `Application update: ${jobTitle}${institutionName ? ' at ' + institutionName : ''}`,
      text: `Hi ${recipient.name || 'there'},

Your application for "${jobTitle}"${institutionName ? ` at ${institutionName}` : ''} has moved to: ${status}.

See details:
  ${frontendUrl()}/jobs

— FacultyConnect
`,
    }),
  },

  faculty_approved: {
    inApp: ({ institutionName }) => ({
      title: `You're verified at ${institutionName}`,
      body: 'You now appear as a verified faculty member across the platform.',
      link: '/profile',
    }),
    email: ({ institutionName }, recipient) => ({
      subject: `Your FacultyConnect account is verified at ${institutionName}`,
      text: `Hi ${recipient.name || 'there'},

Good news — the admin at ${institutionName} has verified your FacultyConnect account. You now appear as a verified member of ${institutionName} across the platform.

Sign in: ${frontendUrl()}/login

— FacultyConnect
`,
    }),
  },

  faculty_rejected: {
    inApp: ({ institutionName, reason }) => ({
      title: `Your affiliation with ${institutionName} was not approved`,
      body: reason || 'The college admin was unable to verify your affiliation.',
      link: '/profile',
    }),
    email: ({ institutionName, reason }, recipient) => ({
      subject: `FacultyConnect: your affiliation with ${institutionName} was not approved`,
      text: `Hi ${recipient.name || 'there'},

The admin at ${institutionName} has reviewed your FacultyConnect signup and was unable to verify your affiliation with the institution.
${reason ? `\nReason given: ${reason}\n` : ''}
You can still use FacultyConnect without an institutional affiliation, or contact the college admin directly to resolve this. If you believe this is a mistake, you can update your institution selection in your profile.

Sign in: ${frontendUrl()}/login

— FacultyConnect
`,
    }),
  },

  invitation_accepted: {
    inApp: ({ facultyName }) => ({
      title: `${facultyName} accepted your invitation`,
      body: 'They activated their account and are now a verified member of your institution.',
      link: '/admin/college?section=roster',
    }),
    // Admins receive many of these; in-app roster nudge is enough.
    email: null,
  },

  message_received: {
    inApp: ({ fromName, preview }) => ({
      title: `New message from ${fromName || 'a collaborator'}`,
      body: preview ? preview.slice(0, 200) : 'Open the message to read.',
      link: '/messages',
    }),
    email: ({ fromName, preview }, recipient) => ({
      subject: `${fromName || 'A collaborator'} sent you a message on FacultyConnect`,
      text: `Hi ${recipient.name || 'there'},

${fromName || 'A collaborator'} sent you a message on FacultyConnect:

"${(preview || '').slice(0, 500)}"

Reply on-platform (full history stays here):
  ${frontendUrl()}/messages

— FacultyConnect
`,
    }),
  },

  saved_search_matches: {
    inApp: ({ searchName, count }) => ({
      title: `${count} new ${count === 1 ? 'match' : 'matches'} for "${searchName}"`,
      body:
        count === 1
          ? 'A fresh opportunity was posted overnight that matches your saved search.'
          : 'Fresh opportunities were posted overnight that match your saved search.',
      link: '/saved-searches',
    }),
    email: ({ searchName, count, previews = [] }, recipient) => ({
      subject: `${count} new ${count === 1 ? 'match' : 'matches'} for "${searchName}" on FacultyConnect`,
      text: `Hi ${recipient.name || 'there'},

Fresh opportunities matched your saved search "${searchName}" overnight:

${previews
  .slice(0, 5)
  .map(p => `- ${p.title}${p.deadline ? ` (deadline ${new Date(p.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}`)
  .join('\n')}
${count > previews.length ? `\n... and ${count - previews.length} more.` : ''}

View them all:
  ${frontendUrl()}/saved-searches

Manage your saved searches (rename / disable alerts / delete):
  ${frontendUrl()}/saved-searches

— FacultyConnect
`,
    }),
  },
};

export function renderInApp(type, payload) {
  const template = templates[type];
  if (!template) {
    logger.warn('unknown notification type', { type });
    return null;
  }
  return template.inApp(payload);
}

export function renderEmail(type, payload, recipient) {
  const template = templates[type];
  if (!template || !template.email) return null;
  return template.email(payload, recipient);
}

export function hasTemplate(type) {
  return Boolean(templates[type]);
}
