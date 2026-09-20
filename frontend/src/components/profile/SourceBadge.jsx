import React from 'react';

const STYLES = {
  ORCID: 'bg-primary/10 text-primary border-primary/20',
  Scopus: 'bg-accent/10 text-accent border-accent/20',
  'Scholar CSV': 'bg-secondary/10 text-secondary border-secondary/20',
  Vidwan: 'bg-success/10 text-success border-success/30',
  Manual: 'bg-muted text-text-muted border-border',
};

export default function SourceBadge({ source }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        STYLES[source] || STYLES.Manual
      }`}
    >
      {source}
    </span>
  );
}

export function sourceLabel(raw) {
  if (raw === 'orcid') return 'ORCID';
  if (raw === 'scopus') return 'Scopus';
  if (raw === 'scholar_csv') return 'Scholar CSV';
  if (raw === 'vidwan') return 'Vidwan';
  if (raw === 'manual') return 'Manual';
  return raw;
}
