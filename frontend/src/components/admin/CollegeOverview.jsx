import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Users2,
  UserCheck2,
  ClipboardList,
  Quote,
  TrendingUp,
  FileText,
  IndianRupee,
  Clock,
  ChevronDown,
} from 'lucide-react';
import HeroBanner from '../dashboard/HeroBanner';
import StatCard from '../dashboard/StatCard';
import DataTable from '../dashboard/DataTable';
import SectionCard from '../dashboard/SectionCard';
import { SkeletonList } from '../ui/Skeleton';
import { Alert, AlertDescription } from '../ui/Alert';
import { getCollegeOverview } from '../../services/admin.service';

// Compact number formatter for the metric tiles. Keeps totals scannable
// even for large institutions — a research uni's citation count runs to
// six-plus figures. Uses Indian numbering conventions (Lakh / Crore)
// for grant value since audiences read that faster than "M / B" here.
function formatCount(n) {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function formatInr(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

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

  const { institution, counts, recentJobs, research, funnel } = data;
  const totalApps = counts.totalApplications;
  const hasResearchData = research && research.verifiedFaculty > 0;

  // Funnel bar widths — scale each stage to the top-of-funnel count so
  // the visual drop-off is proportional. Falls back to a small min
  // width so a stage with zero candidates is still visible as a hairline.
  const funnelTop = funnel?.stages?.[0]?.value || 0;
  const funnelStageColors = ['#6C5CE7', '#F59E0B', '#00B894', '#64748B'];

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

      {hasResearchData && (
        <SectionCard
          title="Research output"
          subtitle={`Aggregated across ${research.verifiedFaculty} verified faculty. Reflects data reconciled from ORCID / Scopus / manual entry.`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <Quote size={18} className="text-primary" />
                <span className="text-2xl font-extrabold text-secondary tabular-nums">
                  {formatCount(research.totalCitations)}
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mt-2">
                Total citations
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <TrendingUp size={18} className="text-accent" />
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-secondary tabular-nums">
                    {research.avgHIndex}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    max {research.maxHIndex}
                  </div>
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mt-2">
                Avg h-index
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <FileText size={18} className="text-secondary" />
                <span className="text-2xl font-extrabold text-secondary tabular-nums">
                  {formatCount(research.totalPublications)}
                </span>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mt-2">
                Publications
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <IndianRupee size={18} className="text-warning" />
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-secondary tabular-nums">
                    {formatInr(research.totalGrantValue).replace(/^₹/, '')}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {research.facultyWithGrants} faculty
                  </div>
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mt-2">
                Grants received
              </div>
            </div>
          </div>

          {research.topDomains.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">
                Top research areas
              </div>
              <div className="flex flex-wrap gap-1.5">
                {research.topDomains.map(d => (
                  <span
                    key={d.tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 text-xs font-medium"
                  >
                    {d.tag}
                    <span className="tabular-nums text-[10px] bg-primary/10 rounded-full px-1.5 py-0.5">
                      {d.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

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

        <SectionCard
          title="Recruitment funnel"
          subtitle={
            funnel?.avgTimeToFillDays != null
              ? `Avg time-to-fill: ${funnel.avgTimeToFillDays} days (${funnel.closedJobsCount} closed postings)`
              : 'Close a posting to see the average time-to-fill.'
          }
        >
          {funnelTop === 0 ? (
            <div className="text-xs text-text-muted italic text-center py-6">
              No applications yet — the funnel populates as candidates apply.
            </div>
          ) : (
            <div className="space-y-2">
              {funnel.stages.map((stage, i) => {
                const width = Math.max((stage.value / funnelTop) * 100, 3);
                const color = funnelStageColors[i] || funnelStageColors[0];
                const conversionKey = ['appliedToShortlisted', 'shortlistedToInterview', 'interviewToClosed'][i];
                const conversion = conversionKey ? funnel.conversions[conversionKey] : null;
                return (
                  <React.Fragment key={stage.key}>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-text-light">
                          {stage.label}
                        </span>
                        <span className="text-text-muted tabular-nums">
                          {stage.value}
                        </span>
                      </div>
                      <div className="h-6 rounded-md bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{ width: `${width}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    {i < funnel.stages.length - 1 && (
                      <div className="flex items-center justify-center text-[10px] text-text-muted -my-0.5">
                        <ChevronDown size={12} className="opacity-60" />
                        <span className="ml-1 tabular-nums">
                          {conversion != null ? `${conversion}%` : '—'} conv.
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
