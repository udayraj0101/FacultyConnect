import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPublicProfile } from './public.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('public-html');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_INDEX_PATH = path.resolve(__dirname, '../../frontend/dist/index.html');

// In-memory cache of the frontend shell — the build hash rarely changes
// within a process lifetime, so re-reading on every request is wasted IO.
// If the dist is rebuilt, the process should be restarted anyway.
let shellCache = null;

async function loadShell() {
  if (shellCache) return shellCache;
  try {
    shellCache = await fs.readFile(DIST_INDEX_PATH, 'utf-8');
    return shellCache;
  } catch (err) {
    // Fallback shell for dev (no dist/) — crawlers still get content and
    // meta tags, humans just won't get the SPA when hitting the backend
    // directly. Vite dev server still serves the SPA over :5173.
    logger.warn('dist/index.html not found, using minimal shell', {
      path: DIST_INDEX_PATH,
      error: err.message,
    });
    return MINIMAL_SHELL;
  }
}

const MINIMAL_SHELL = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FacultyConnect</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

function displayDesignation(d) {
  return d === 'Professor' ? 'Professor' : `${d} Professor`;
}

function buildBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host');
  return `${proto}://${host}`;
}

function buildMetaBlock(profile, canonical) {
  const designation = displayDesignation(profile.designation);
  const institution = profile.institution?.name ? ` at ${profile.institution.name}` : '';
  const areas =
    profile.domainTags?.length > 0
      ? ` Research areas: ${profile.domainTags.slice(0, 5).join(', ')}.`
      : '';
  const bioSnippet = profile.bio
    ? ` ${profile.bio.slice(0, 160)}${profile.bio.length > 160 ? '…' : ''}`
    : '';
  const description = `${profile.name}, ${designation}${institution}.${areas}${bioSnippet}`.trim();
  const title = `${profile.name} · ${profile.institution?.name || 'FacultyConnect'}`;

  const sameAs = Object.values(profile.externalLinks || {}).filter(Boolean);
  if (profile.orcidId) sameAs.push(`https://orcid.org/${profile.orcidId}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: designation,
    description: profile.bio || undefined,
    knowsAbout: profile.domainTags?.length ? profile.domainTags : undefined,
    affiliation: profile.institution
      ? { '@type': 'CollegeOrUniversity', name: profile.institution.name }
      : undefined,
    identifier: profile.orcidId
      ? { '@type': 'PropertyValue', propertyID: 'ORCID', value: profile.orcidId }
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    url: canonical,
  };

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(description)}" />
    <link rel="canonical" href="${escapeAttr(canonical)}" />
    <meta property="og:title" content="${escapeAttr(profile.name)} — Academic profile" />
    <meta property="og:description" content="${escapeAttr(description)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${escapeAttr(canonical)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeAttr(profile.name)}" />
    <meta name="twitter:description" content="${escapeAttr(description)}" />
    <meta name="robots" content="index,follow" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `.trim();
}

function buildNoscriptBlock(profile, baseUrl) {
  const designation = displayDesignation(profile.designation);
  const institutionLine = profile.institution?.name
    ? `<p>${escapeHtml(designation)}${
        profile.department ? ` · ${escapeHtml(profile.department)}` : ''
      } · ${escapeHtml(profile.institution.name)}</p>`
    : `<p>${escapeHtml(designation)}</p>`;

  const tagsBlock =
    profile.domainTags?.length > 0
      ? `<p><strong>Research areas:</strong> ${profile.domainTags.map(escapeHtml).join(', ')}</p>`
      : '';

  const bioBlock = profile.bio
    ? `<p>${escapeHtml(profile.bio)}</p>`
    : '';

  const orcidBlock = profile.orcidId
    ? `<p><strong>ORCID iD:</strong> <a href="https://orcid.org/${escapeAttr(profile.orcidId)}">${escapeHtml(profile.orcidId)}</a></p>`
    : '';

  const employmentBlock =
    profile.employmentHistory?.length > 0
      ? `<h2>Employment</h2><ul>${profile.employmentHistory
          .map(e => {
            const range = e.current
              ? `${e.from || '?'} – Present`
              : `${e.from || '?'} – ${e.to || '?'}`;
            return `<li><strong>${escapeHtml(e.designation || 'Faculty')}</strong>, ${escapeHtml(
              e.institution,
            )} (${escapeHtml(range)})</li>`;
          })
          .join('')}</ul>`
      : '';

  const educationBlock =
    profile.education?.length > 0
      ? `<h2>Education</h2><ul>${profile.education
          .map(
            e =>
              `<li>${escapeHtml(e.degree)}${e.field ? ` in ${escapeHtml(e.field)}` : ''}${
                e.institution ? `, ${escapeHtml(e.institution)}` : ''
              }${e.year ? ` (${e.year})` : ''}</li>`,
          )
          .join('')}</ul>`
      : '';

  const awardsBlock =
    profile.awards?.length > 0
      ? `<h2>Awards</h2><ul>${profile.awards
          .map(a => `<li>${escapeHtml(a.title)}${a.year ? ` (${a.year})` : ''}</li>`)
          .join('')}</ul>`
      : '';

  const grantsBlock =
    profile.grantsReceived?.length > 0
      ? `<h2>Grants</h2><ul>${profile.grantsReceived
          .map(g => {
            const parts = [escapeHtml(g.title)];
            if (g.agency) parts.push(escapeHtml(g.agency));
            if (g.year) parts.push(String(g.year));
            return `<li>${parts.join(' · ')}${g.ongoing ? ' (ongoing)' : ''}</li>`;
          })
          .join('')}</ul>`
      : '';

  const pubsBlock =
    profile.publications?.length > 0
      ? `<h2>Publications</h2><ul>${profile.publications
          .map(
            p =>
              `<li><strong>${escapeHtml(p.title)}</strong>${
                p.venue ? `, <em>${escapeHtml(p.venue)}</em>` : ''
              }${p.year ? ` (${p.year})` : ''}${
                p.doi ? ` — <a href="https://doi.org/${escapeAttr(p.doi)}">DOI</a>` : ''
              }</li>`,
          )
          .join('')}</ul>`
      : '';

  const linksBlock = (() => {
    const links = Object.entries(profile.externalLinks || {}).filter(([, v]) => v);
    if (!links.length) return '';
    return `<h2>Links</h2><ul>${links
      .map(([k, v]) => `<li><a href="${escapeAttr(v)}" rel="noopener">${escapeHtml(k)}</a></li>`)
      .join('')}</ul>`;
  })();

  return `<noscript>
    <div style="max-width:720px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.5">
      <h1>${escapeHtml(profile.name)}</h1>
      ${institutionLine}
      ${bioBlock}
      ${tagsBlock}
      ${orcidBlock}
      ${employmentBlock}
      ${educationBlock}
      ${awardsBlock}
      ${grantsBlock}
      ${pubsBlock}
      ${linksBlock}
      <hr>
      <p><a href="${escapeAttr(baseUrl)}/">FacultyConnect</a> — enable JavaScript for the interactive version.</p>
    </div>
  </noscript>`;
}

/**
 * Inject SEO meta tags + noscript content into the SPA shell for a
 * public profile. Used by the /f/:handleOrId route on the backend so
 * crawlers see full content and meta tags without needing to execute
 * JavaScript.
 *
 * Returns { html, status } where status is 200 on success and 404
 * when the profile isn't opted in (opaque — same message as unknown ID).
 */
export async function renderPublicProfileHtml(handleOrId, req) {
  const baseUrl = buildBaseUrl(req);
  const notFoundHtml = () => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>Profile not found · FacultyConnect</title>
<meta name="robots" content="noindex">
</head><body>
<div style="max-width:520px;margin:4rem auto;padding:0 1rem;font-family:system-ui,sans-serif;text-align:center">
<h1>Profile not found</h1>
<p>This profile is not publicly available.</p>
<p><a href="${escapeAttr(baseUrl)}/">Go to FacultyConnect</a></p>
</div></body></html>`;

  let profile;
  try {
    profile = await getPublicProfile(handleOrId);
  } catch (err) {
    if (err.status === 404) return { html: notFoundHtml(), status: 404 };
    throw err;
  }

  // Canonical URL always uses the vanity handle when present, so link
  // equity concentrates on one URL even if a visitor lands via ObjectId.
  const handle = profile.publicHandle || profile.id;
  const canonical = `${baseUrl}/f/${handle}`;

  const shell = await loadShell();
  const metaBlock = buildMetaBlock(profile, canonical);
  const noscriptBlock = buildNoscriptBlock(profile, baseUrl);

  // Strip any hard-coded <title> from the shell so ours wins.
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, '');
  // Inject meta right before </head>.
  html = html.replace('</head>', `${metaBlock}\n</head>`);
  // Inject noscript at the top of body so it renders before the SPA mounts.
  html = html.replace('<body>', `<body>\n${noscriptBlock}`);

  return { html, status: 200 };
}
