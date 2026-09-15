import React from 'react';
import { Quote, TrendingUp, Award, FileText } from 'lucide-react';
import StatCard from '../dashboard/StatCard';
import SectionCard from '../dashboard/SectionCard';

export default function MetricsStrip({ faculty, publicationsCount }) {
  const usingScopus = Boolean(faculty.scopusAuthorId);
  const source = usingScopus ? 'Scopus' : 'ORCID';
  // Citation-derived metrics without any publications on file look broken
  // (an h-index of 18 implies ≥18 papers). This happens when the linked
  // ORCID has metrics but no works, e.g. sandbox accounts. Show a dash
  // instead of the number and caveat the strip so the profile stays trustworthy.
  const derivedUnreconciled = publicationsCount === 0 &&
    (faculty.citationCount || faculty.hIndex || faculty.i10Index);
  const metricValue = raw => (derivedUnreconciled ? '—' : raw ?? 0);
  const metricSublabel = derivedUnreconciled
    ? 'Awaiting publications'
    : `Source: ${source}`;

  const subtitle = derivedUnreconciled
    ? 'Metrics will appear here once your publications sync from ORCID/Scopus.'
    : faculty.orcidId
      ? `Auto-synced from ${source}`
      : 'Connect ORCID to populate these automatically';

  return (
    <SectionCard title="Research metrics" subtitle={subtitle}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          index={0}
          icon={<Quote size={20} />}
          color="#6C5CE7"
          value={metricValue(faculty.citationCount)}
          label="Citations"
          sublabel={metricSublabel}
        />
        <StatCard
          index={1}
          icon={<TrendingUp size={20} />}
          color="#00B894"
          value={metricValue(faculty.hIndex)}
          label="h-index"
          sublabel={metricSublabel}
        />
        <StatCard
          index={2}
          icon={<Award size={20} />}
          color="#F59E0B"
          value={metricValue(faculty.i10Index)}
          label="i10-index"
          sublabel={metricSublabel}
        />
        <StatCard
          index={3}
          icon={<FileText size={20} />}
          color="#1A237E"
          value={publicationsCount}
          label="Publications"
          sublabel="Source: ORCID"
        />
      </div>
    </SectionCard>
  );
}
