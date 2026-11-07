import { Faculty } from '../models/Faculty.js';

const SITEMAP_LIMIT = 50_000; // XML sitemap spec cap per file

// Mirrors publicHtml.service.js — staging / dev return an empty sitemap
// so crawlers never discover the test corpus. Prod sets
// PUBLIC_INDEXING_ENABLED=true in .env to opt in.
function isPublicIndexingEnabled() {
  return String(process.env.PUBLIC_INDEXING_ENABLED || '').toLowerCase() === 'true';
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * XML sitemap of all opted-in public profiles. Uses vanity handle when
 * present, falls back to ObjectId. Includes <lastmod> so crawlers can
 * skip pages that haven't changed.
 *
 * If the corpus exceeds SITEMAP_LIMIT we'll want to split into a
 * sitemap index. Deferring that until we're anywhere close.
 */
export async function generatePublicProfileSitemap(baseUrl) {
  // Short-circuit on staging — return an empty but valid sitemap so
  // crawlers that hit /sitemap.xml get a clean 200 with nothing to
  // follow. Keeps test data out of Google.
  if (!isPublicIndexingEnabled()) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  }

  const docs = await Faculty.find({
    publicProfileEnabled: true,
    role: 'Faculty',
  })
    .select('_id publicHandle updatedAt')
    .sort({ updatedAt: -1 })
    .limit(SITEMAP_LIMIT)
    .lean();

  const stripped = baseUrl.replace(/\/$/, '');

  const urls = docs
    .map(d => {
      const seg = d.publicHandle || d._id.toString();
      const loc = `${stripped}/f/${seg}`;
      const lastmod = new Date(d.updatedAt || Date.now()).toISOString();
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
