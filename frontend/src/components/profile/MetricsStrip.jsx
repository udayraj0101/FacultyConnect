import React from 'react';
import { Quote, TrendingUp, Award, FileText } from 'lucide-react';
import StatCard from '../dashboard/StatCard';
import SectionCard from '../dashboard/SectionCard';

export default function MetricsStrip({ faculty, publicationsCount }) {
  const usingScopus = Boolean(faculty.scopusAuthorId);
  const source = usingScopus ? 'Scopus' : 'ORCID';

  return (
    <SectionCard
      title="Research metrics"
      subtitle={
        faculty.orcidId
          ? `Auto-synced from ${source}`
          : 'Connect ORCID to populate these automatically'
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          index={0}
          icon={<Quote size={20} />}
          color="#6C5CE7"
          value={faculty.citationCount ?? 0}
          label="Citations"
          sublabel={`Source: ${source}`}
        />
        <StatCard
          index={1}
          icon={<TrendingUp size={20} />}
          color="#00B894"
          value={faculty.hIndex ?? 0}
          label="h-index"
          sublabel={`Source: ${source}`}
        />
        <StatCard
          index={2}
          icon={<Award size={20} />}
          color="#F59E0B"
          value={faculty.i10Index ?? 0}
          label="i10-index"
          sublabel={`Source: ${source}`}
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
