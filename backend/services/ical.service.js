// Minimal RFC-5545 iCalendar generator. Deliberately hand-rolled — the
// spec is small enough for the fields we care about (VEVENT with SUMMARY
// / DESCRIPTION / DTSTART / DTEND / LOCATION / URL / UID) and pulling in
// a full library (ical-generator etc.) is an outsized dependency for
// one endpoint. Line folding is skipped — most calendar clients accept
// long lines despite the spec. If we hit a client that doesn't, wrap.

function pad(n) {
  return String(n).padStart(2, '0');
}

// Format a Date as UTC in YYYYMMDDTHHmmssZ. iCalendar recommends UTC
// for portable events unless a TZID is given; we take that path so
// downloaded events land at the correct wall-clock in whichever tz the
// receiving calendar app uses.
function fmtUtc(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

// All-day date-only form for events without explicit start / end times.
// Preferred when the seed just says "October 12–14" — clients render
// these as multi-day full-day events instead of midnight-to-midnight
// blocks.
function fmtDate(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate())
  );
}

function esc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Render an Opportunity as an .ics document.
 *
 * - Events with startDate use it as DTSTART; missing endDate falls back
 *   to the same day so single-day events don't drop off.
 * - When no startDate is set, we synthesise an all-day event on the
 *   deadline as a fallback so bookmark-calendar exports don't silently
 *   skip venues that only track submission cutoffs.
 * - UID is deterministic (opportunity id + host) so re-importing an
 *   updated version replaces the old event in the receiving client.
 */
export function buildEventIcs(opportunity, { host }) {
  const uid = `${opportunity._id.toString()}@${host || 'facultyconnect.in'}`;
  const now = new Date();
  const start = opportunity.startDate || opportunity.deadline;
  const end = opportunity.endDate || opportunity.startDate || opportunity.deadline;
  const allDay = !opportunity.startDate;

  // Assemble the LOCATION line. Prefer the structured city+state pair;
  // fall back to the free-text location if we have nothing structured;
  // suppress the free-text when it's just "City, State" (which duplicates
  // what we already put in).
  const structured = [opportunity.city, opportunity.state].filter(Boolean).join(', ');
  const locationParts = [];
  if (structured) locationParts.push(structured);
  if (
    opportunity.location &&
    opportunity.location !== structured &&
    !structured.startsWith(opportunity.location) &&
    !opportunity.location.startsWith(structured)
  ) {
    locationParts.push(opportunity.location);
  } else if (!structured && opportunity.location) {
    locationParts.push(opportunity.location);
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FacultyConnect//Discover//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtUtc(now)}`,
  ];

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(start)}`);
    // Non-inclusive end for all-day — add one day so a single-day event
    // renders on the correct date rather than blocking a whole day+1.
    const endPlus = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    lines.push(`DTEND;VALUE=DATE:${fmtDate(endPlus)}`);
  } else {
    lines.push(`DTSTART:${fmtUtc(start)}`);
    lines.push(`DTEND:${fmtUtc(end)}`);
  }

  lines.push(`SUMMARY:${esc(opportunity.title)}`);
  if (opportunity.description) {
    lines.push(`DESCRIPTION:${esc(opportunity.description)}`);
  }
  if (locationParts.length) {
    lines.push(`LOCATION:${esc(locationParts.join(', '))}`);
  }
  if (opportunity.url) {
    lines.push(`URL:${esc(opportunity.url)}`);
  }
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // iCalendar wants CRLF line endings — Outlook is strict about it.
  return lines.join('\r\n') + '\r\n';
}
