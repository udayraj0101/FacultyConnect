import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Users2,
  UserCheck2,
  ClipboardList,
} from 'lucide-react';
import HeroBanner from '../dashboard/HeroBanner';
import StatCard from '../dashboard/StatCard';
import BreakdownBar from '../dashboard/BreakdownBar';
import DataTable from '../dashboard/DataTable';
import SectionCard from '../dashboard/SectionCard';
import { SkeletonList } from '../ui/Skeleton';
import { Alert, AlertDescription } from '../ui/Alert';
import { getCollegeOverview } from '../../services/admin.service';

const STATUS_PILL = {
  open: 'bg-success/10 text-success border-success/30',
  closed: 'bg-muted text-text-muted border-border',
};

function daysUntil(date) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function CollegeOverview({ onOpenSection }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getCollegeOverview();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.error?.message || 'Failed to load overview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-3xl bg-muted animate-pulse" />
        <SkeletonList count={2} cardLines={2} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || 'Something went wrong.'}</AlertDescription>
      </Alert>
    );
  }

  const { institution, counts, applicantsBreakdown, recentJobs } = data;
  const totalApps = counts.totalApplications;

  return (
    <div className="space-y-6">
      <HeroBanner
        title={`Welcome, ${institution.name}`}
        subtitle="Manage postings, review applicants, and keep your institutional presence up to date."
        emoji="🏛"
        stats={[
          { icon: <Briefcase size={18} />, value: counts.openJobs, label: 'Open jobs' },
          { icon: <ClipboardList size={18} />, value: totalApps, label: 'Applicants' },
          { icon: <UserCheck2 size={18} />, value: counts.facultyLinked, label: 'Faculty on roster' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          index={0}
          icon={<Briefcase size={20} />}
          color="#6C5CE7"
          value={counts.totalJobs}
          label="Total jobs posted"
          sublabel={`${counts.openJobs} open · ${counts.closedJobs} closed`}
        />
        <StatCard
          index={1}
          icon={<ClipboardList size={20} />}
          color="#00B894"
          value={totalApps}
          label="Total applications"
          sublabel="Across all your jobs"
        />
        <StatCard
          index={2}
          icon={<Users2 size={20} />}
          color="#F59E0B"
          value={counts.facultyLinked}
          label="Faculty roster"
          sublabel="Accounts linked to your institution"
        />
        <StatCard
          index={3}
          icon={<UserCheck2 size={20} />}
          color="#1A237E"
          value={institution.verificationStatus.toUpperCase()}
          label="Institution status"
          sublabel={institution.subscriptionTier === 'paid' ? 'Paid tier' : 'Free tier'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          className="lg:col-span-2"
          title="Recent postings"
          subtitle="Latest jobs from your institution"
          trailing={
            <button
              onClick={() => onOpenSection?.('myjobs')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all →
            </button>
          }
        >
          <DataTable
            columns={[
              {
                key: 'title',
                label: 'Title',
                render: r => (
                  <div>
                    <div className="font-semibold text-text-light">{r.title}</div>
                    <div className="text-xs text-text-muted">
                      {r.department} · {r.designation}
                    </div>
                  </div>
                ),
              },
              {
                key: 'deadline',
                label: 'Deadline',
                render: r => {
                  const d = daysUntil(r.deadline);
                  return (
                    <div>
                      <div className="text-xs">
                        {new Date(r.deadline).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div
                        className={`text-[11px] ${d < 0 ? 'text-danger' : d <= 7 ? 'text-danger' : 'text-text-muted'}`}
                      >
                        {d < 0 ? 'closed' : `${d} day${d === 1 ? '' : 's'} left`}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'status',
                label: 'Status',
                render: r => (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_PILL[r.status] || STATUS_PILL.closed}`}
                  >
                    {r.status}
                  </span>
                ),
              },
            ]}
            rows={recentJobs}
            emptyLabel="No jobs posted yet. Head to Post Job to create one."
          />
        </SectionCard>

        <BreakdownBar
          title="Applicant pipeline"
          items={[
            { label: 'Applied', value: applicantsBreakdown.applied, color: '#6C5CE7' },
            { label: 'Shortlisted', value: applicantsBreakdown.shortlisted, color: '#F59E0B' },
            { label: 'Interview', value: applicantsBreakdown.interview, color: '#00B894' },
            { label: 'Closed', value: applicantsBreakdown.closed, color: '#64748B' },
          ]}
          total={totalApps || 1}
        />
      </div>
    </div>
  );
}
