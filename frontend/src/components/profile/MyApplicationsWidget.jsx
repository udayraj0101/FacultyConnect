import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowRight } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { listMyApplications } from '../../services/job.service';

const STATUS_STYLES = {
  applied: 'bg-primary/10 text-primary border-primary/30',
  shortlisted: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  interview: 'bg-accent/10 text-accent border-accent/30',
  closed: 'bg-muted text-text-muted border-border',
};

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function MyApplicationsWidget() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyApplications();
        if (!cancelled) setApps(list);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionCard
      title="My applications"
      subtitle="Jobs you've applied to"
      trailing={
        apps.length > 0 && (
          <Link to="/jobs" className="text-xs font-semibold text-primary hover:underline">
            Browse more →
          </Link>
        )
      }
    >
      {loading ? (
        <SkeletonList count={2} cardLines={1} />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={18} />}
          title="No applications yet"
          description="Browse the job board and apply with one click — your ORCID profile auto-attaches."
          action={
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
            >
              Explore jobs <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {apps.slice(0, 5).map(app => {
            const days = app.job ? daysUntil(app.job.deadline) : null;
            return (
              <div key={app.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-light truncate">
                    {app.job?.title || '(job removed)'}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 truncate">
                    {app.job?.institution?.name}
                    {app.job?.deadline && ` · Deadline ${new Date(app.job.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                    {days != null && days < 0 && ' · closed'}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[app.status] || STATUS_STYLES.applied}`}
                >
                  {app.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
