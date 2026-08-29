import { useEffect } from 'react';

/**
 * Dynamically sets document.title + <meta> + <link rel="canonical"> +
 * optional JSON-LD structured data on the client. Cleans up on unmount.
 *
 * Good enough for Googlebot (Chromium-based, executes JS). Non-JS crawlers
 * (Bing, older archives) won't see these — full SSR is a separate concern
 * tracked as a v2 SEO enhancement.
 */
export function useSeoMeta({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogType = 'profile',
  ogImage,
  jsonLd,
} = {}) {
  useEffect(() => {
    if (!title && !description) return undefined;

    const prevTitle = document.title;
    if (title) document.title = title;

    const created = [];

    const upsertMeta = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
        created.push(el);
      }
      el.setAttribute('content', content);
    };

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', ogTitle || title);
    upsertMeta('property', 'og:description', ogDescription || description);
    upsertMeta('property', 'og:type', ogType);
    if (ogImage) upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', ogTitle || title);
    upsertMeta('name', 'twitter:description', ogDescription || description);

    let canonicalEl;
    if (canonical) {
      canonicalEl = document.head.querySelector('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
        created.push(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonical);
    }

    let jsonLdEl;
    if (jsonLd) {
      jsonLdEl = document.createElement('script');
      jsonLdEl.type = 'application/ld+json';
      jsonLdEl.text = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdEl);
      created.push(jsonLdEl);
    }

    return () => {
      document.title = prevTitle;
      for (const el of created) el.remove();
    };
  }, [
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogType,
    ogImage,
    JSON.stringify(jsonLd),
  ]);
}
