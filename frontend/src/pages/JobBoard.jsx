import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Building2,
  MapPin,
  IndianRupee,
  CalendarClock,
  BadgeCheck,
  ClipboardList,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import HeroBanner from '../components/dashboard/HeroBanner';
import SectionCard from '../components/dashboard/SectionCard';
import ReportModal from '../components/ReportModal';
import { listJobs, applyToJob, listMyApplications } from '../services/job.service';

const DESIGNATION_OPTIONS = [
  { value: 'Assistant', label: 'Assistant Professor' },
  { value: 'Associate', label: 'Associate Professor' },
  { value: 'Professor', label: 'Professor' },
  { value: 'Guest', label: 'Guest Professor' },
  { value: 'Research', label: 'Research' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'deadline_desc', label: 'Deadline (latest)' },
];

const DESIGNATION_COLOR = {
  Assistant: '#6C5CE7',
  Associate: '#00B894',
  Professor: '#1A237E',
  Guest: '#F59E0B',
  Research: '#64748B',
};

const STATUS_COPY = {
  applied: 'Application received — the college has your profile.',
  shortlisted: 'You were shortlisted for this role.',
  interview: 'Interview stage — the college will reach out for scheduling.',
  closed: 'This application has been closed by the college.',
};

const STATUS_PILL_STYLES = {
  applied: 'bg-primary/10 text-primary border-primary/30',
  shortlisted: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  interview: 'bg-accent/10 text-accent border-accent/30',
  closed: 'bg-muted text-text-muted border-border',
};

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_PILL_STYLES[status] || STATUS_PILL_STYLES.applied}`}
    >
      {status}
    </span>
  );
}

function JobCard({ job, appliedStatus, onApply, onReport, applying, index }) {
  const days = daysUntil(job.deadline);
  const applied = Boolean(appliedStatus);
  const isVerified = job.institution?.verificationStatus === 'verified';
  const color = DESIGNATION_COLOR[job.designation] || '#6C5CE7';

  return (
    <motion.article
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(index, 6) * 0.04 }}
      className="relative rounded-xl bg-white border border-border hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="pl-5 pr-5 py-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-light leading-snug">{job.title}</h3>
            <div className="text-sm text-text-muted mt-1 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 font-medium">
                <Building2 size={13} /> {job.institution?.name}
              </span>
              {isVerified && (
                <span className="inline-flex items-center gap-1 text-success text-xs">
                  <BadgeCheck size={12} /> Verified
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {applied ? (
              <StatusPill status={appliedStatus} />
            ) : (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {job.designation}
              </span>
            )}
            <button
              onClick={() => onReport(job)}
              aria-label="Report this job"
              title="Report"
              className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/5 transition-colors"
            >
              <Flag size={16} />
            </button>
          </div>
        </div>

        <div className="text-sm text-text-muted flex items-center gap-3 flex-wrap">
          <span>{job.department}</span>
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {job.location}
            </span>
          )}
          {job.experienceYears ? <span>· {job.experienceYears}+ years</span> : null}
        </div>

        <p className="text-sm text-text-muted line-clamp-3 leading-relaxed">{job.description}</p>

        {job.domainTags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.domainTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary/5 text-primary text-[11px] px-2 py-0.5 border border-primary/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {job.salaryDisclosed && (
          <div className="inline-flex items-center gap-1 text-xs text-text-muted italic">
            <IndianRupee size={12} /> {job.salaryDisclosed}
          </div>
        )}

        {applied && (
          <div className="rounded-md bg-primary/5 border border-primary/15 px-3 py-2 text-xs text-text-light">
            <span className="font-semibold">Status:</span>{' '}
            {STATUS_COPY[appliedStatus] || 'Under review.'}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 gap-4 flex-wrap">
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              days <= 7 ? 'text-danger' : 'text-text-muted'
            }`}
          >
            <CalendarClock size={12} />
            {new Date(job.deadline).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {days > 0 ? `${days}d left` : 'closed'}
          </div>
          {applied ? (
            <span className="text-xs text-text-muted italic">Already applied</span>
          ) : (
            <Button size="sm" onClick={() => onApply(job)} disabled={applying}>
              {applying ? 'Applying…' : 'Apply'}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function JobBoard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({ q: '', designation: [], location: '', sort: 'newest' });
  const [pendingQuery, setPendingQuery] = useState('');
  const [data, setData] = useState({ jobs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [confirmJob, setConfirmJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);

  const applicationsByJobId = useMemo(() => {
    const map = new Map();
    applications.forEach(a => map.set(a.job?.id, a.status));
    return map;
  }, [applications]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apps = await listMyApplications();
        if (!cancelled) setApplications(apps);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listJobs(filters)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load jobs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const toggleDesignation = value => {
    setFilters(prev => {
      const has = prev.designation.includes(value);
      return {
        ...prev,
        designation: has ? prev.designation.filter(d => d !== value) : [...prev.designation, value],
      };
    });
  };

  const applyKeyword = e => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, q: pendingQuery.trim() }));
  };

  const doApply = async () => {
    if (!confirmJob) return;
    setApplyingId(confirmJob.id);
    setError('');
    try {
      const app = await applyToJob(confirmJob.id);
      setApplications(prev => [
        {
          id: app.id,
          status: app.status,
          appliedAt: app.appliedAt,
          job: confirmJob,
        },
        ...prev,
      ]);
      toast({
        title: 'Application submitted',
        description: `${confirmJob.title.slice(0, 60)}${confirmJob.title.length > 60 ? '…' : ''}`,
        variant: 'success',
      });
      setConfirmJob(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Application failed');
    } finally {
      setApplyingId(null);
    }
  };

  const activeApps = applications.filter(a => a.status !== 'closed').length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title="Job Board"
        subtitle="Faculty openings at verified Indian institutions. Applying auto-attaches your ORCID-populated profile — no re-typing."
        emoji="💼"
        stats={[
          { icon: <Briefcase size={18} />, value: data.total, label: 'Open positions' },
          { icon: <ClipboardList size={18} />, value: applications.length, label: 'Your applications' },
          { icon: <CheckCircle2 size={18} />, value: activeApps, label: 'Active pipeline' },
        ]}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-6">
        <SectionCard title="Filters" subtitle="Narrow the list">
          <div className="space-y-6">
            <form onSubmit={applyKeyword}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Search
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Title, keyword"
                  value={pendingQuery}
                  onChange={e => setPendingQuery(e.target.value)}
                />
                <Button type="submit" size="sm" variant="outline">
                  Go
                </Button>
              </div>
            </form>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Designation
              </div>
              <div className="space-y-1">
                {DESIGNATION_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm cursor-pointer py-1"
                  >
                    <input
                      type="checkbox"
                      checked={filters.designation.includes(opt.value)}
                      onChange={() => toggleDesignation(opt.value)}
                      className="accent-primary"
                    />
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DESIGNATION_COLOR[opt.value] }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                Location
              </label>
              <Input
                placeholder="e.g. Chennai"
                value={filters.location}
                onChange={e => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            {applications.length > 0 && (
              <div className="border-t border-border pt-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  My applications
                </div>
                <div className="text-sm text-text-muted">
                  <span className="font-semibold text-text-light">{applications.length}</span>{' '}
                  total · {activeApps} active
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <section>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="text-sm text-text-muted">
              {!loading && (
                <>
                  <span className="font-semibold text-text-light">{data.total}</span> job
                  {data.total === 1 ? '' : 's'} open
                </>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-text-muted">
              <span className="font-semibold uppercase tracking-wider">Sort</span>
              <select
                value={filters.sort}
                onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                className="h-8 rounded-md border border-border bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading && <SkeletonList count={3} cardLines={3} />}

          {!loading && data.jobs.length === 0 && (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="No jobs match your filters"
              description="Try broader filters, or check back later — new roles get posted often."
            />
          )}

          <div className="grid gap-4">
            {data.jobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                appliedStatus={applicationsByJobId.get(job.id)}
                applying={applyingId === job.id}
                onApply={setConfirmJob}
                onReport={setReportTarget}
              />
            ))}
          </div>
        </section>
      </div>

      {reportTarget && (
        <ReportModal
          targetType="job"
          targetId={reportTarget.id}
          targetLabel={`${reportTarget.title} · ${reportTarget.institution?.name || ''}`}
          onClose={() => setReportTarget(null)}
          onSubmitted={() => setReportTarget(null)}
        />
      )}

      {confirmJob && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => (applyingId ? null : setConfirmJob(null))}
        >
          <div
            className="max-w-md w-full rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="h-1"
              style={{
                background: `linear-gradient(to right, ${DESIGNATION_COLOR[confirmJob.designation]}, ${DESIGNATION_COLOR[confirmJob.designation]}66)`,
              }}
            />
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-secondary">Confirm application</h2>
              <p className="text-sm text-text-muted">
                You're about to apply to{' '}
                <span className="font-semibold text-text-light">{confirmJob.title}</span> at{' '}
                <span className="font-semibold text-text-light">{confirmJob.institution?.name}</span>
                . Your profile — name, designation, ORCID, domain tags, publications — will be shared
                with the college's hiring team.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmJob(null)} disabled={!!applyingId}>
                  Cancel
                </Button>
                <Button onClick={doApply} disabled={!!applyingId}>
                  {applyingId ? 'Submitting…' : 'Confirm apply'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
