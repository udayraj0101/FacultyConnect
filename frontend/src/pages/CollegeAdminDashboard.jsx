import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  ListChecks,
  KanbanSquare,
  Megaphone,
  ListPlus,
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  Globe,
  BadgeCheck,
  Clock,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Alert, AlertDescription } from '../components/ui/Alert';
import SectionCard from '../components/dashboard/SectionCard';
import AdminShell from '../components/shared/AdminShell';
import PostJobForm from '../components/admin/PostJobForm';
import MyJobsList from '../components/admin/MyJobsList';
import ApplicantsKanban from '../components/admin/ApplicantsKanban';
import CollegeOverview from '../components/admin/CollegeOverview';
import PostOpportunityForm from '../components/admin/PostOpportunityForm';
import MyOpportunitiesList from '../components/admin/MyOpportunitiesList';
import InviteFacultyForm from '../components/admin/InviteFacultyForm';
import FacultyRoster from '../components/admin/FacultyRoster';
import { getMe } from '../services/faculty.service';
import { listMyPostings } from '../services/job.service';
import { listMyOpportunities } from '../services/opportunity.service';
import { listPendingFaculty } from '../services/institution.service';

const ACCENT = '#6C5CE7';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { key: 'institution', label: 'Institution', icon: <Building2 size={16} /> },
  { key: 'invite-faculty', label: 'Invite Faculty', icon: <UserPlus size={16} /> },
  { key: 'roster', label: 'Faculty Roster', icon: <Users size={16} /> },
  { key: 'post-opportunity', label: 'Post Opportunity', icon: <Megaphone size={16} /> },
  { key: 'my-opportunities', label: 'My Opportunities', icon: <ListPlus size={16} /> },
  { key: 'post-job', label: 'Post Job', icon: <Briefcase size={16} /> },
  { key: 'my-jobs', label: 'My Jobs', icon: <ListChecks size={16} /> },
  { key: 'applicants', label: 'Applicants', icon: <KanbanSquare size={16} /> },
];

function VerificationPill({ status }) {
  const meta = {
    verified: { cls: 'bg-success/10 text-success border-success/30', icon: BadgeCheck, label: 'Verified' },
    pending: { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock, label: 'Pending' },
    rejected: { cls: 'bg-danger/10 text-danger border-danger/30', icon: XCircle, label: 'Rejected' },
  };
  const m = meta[status] || meta.pending;
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${m.cls}`}
    >
      <Icon size={12} /> {m.label}
    </span>
  );
}

function InstitutionSection({ inst, user }) {
  const initials = (inst.name || 'C')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z0-9]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      <SectionCard title="Institution profile" subtitle="Read-only for now — edit flow coming soon">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-xl font-extrabold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-secondary leading-tight">{inst.name}</h3>
              <VerificationPill status={inst.verificationStatus} />
            </div>
            <div className="mt-1 text-sm text-text-muted flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Globe size={13} /> {inst.domain}
              </span>
              {inst.aisheCode && (
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck size={13} /> AISHE {inst.aisheCode}
                </span>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Subscription">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-lg font-extrabold text-secondary capitalize">
                {inst.subscriptionTier || 'free'} tier
              </div>
              <div className="text-xs text-text-muted">
                {inst.subscriptionTier === 'paid'
                  ? 'Analytics + priority verification + branded listings.'
                  : 'Free tier. Upgrade for analytics and branding.'}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Admin contact">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Mail size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-light truncate">
                {user?.name || 'You'}
              </div>
              <div className="text-xs text-text-muted truncate">{user?.email}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Institution ID" subtitle="For support tickets and API integrations">
        <div className="font-mono text-xs text-text-muted bg-muted/40 border border-border rounded-md px-3 py-2 select-all">
          {inst.id}
        </div>
      </SectionCard>
    </div>
  );
}

function ComingSoon({ title, description }) {
  return (
    <SectionCard title={title || 'Coming soon'} subtitle="Not built yet — planned for a later phase">
      <div className="text-sm text-text-muted leading-relaxed">{description}</div>
    </SectionCard>
  );
}

export default function CollegeAdminDashboard() {
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [postingCounts, setPostingCounts] = useState({ jobs: 0, applicants: 0, opportunities: 0 });
  const [pendingFacultyCount, setPendingFacultyCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSection = searchParams.get('section') || 'overview';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setFaculty(me);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [jobs, opps, pending] = await Promise.all([
          listMyPostings().catch(() => []),
          listMyOpportunities().catch(() => []),
          listPendingFaculty()
            .then(r => r.faculty?.length || 0)
            .catch(() => 0),
        ]);
        if (cancelled) return;
        const totalApps = jobs.reduce((sum, j) => sum + (j.applicantsCount || 0), 0);
        setPostingCounts({
          jobs: jobs.length,
          applicants: totalApps,
          opportunities: opps.length,
        });
        setPendingFacultyCount(pending);
      } catch {
        /* non-fatal for badge counts */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  const setSection = key => {
    const next = new URLSearchParams(searchParams);
    if (key === 'overview') next.delete('section');
    else next.set('section', key);
    setSearchParams(next, { replace: true });
  };

  const openApplicantsFor = jobId => {
    const next = new URLSearchParams(searchParams);
    next.set('section', 'applicants');
    if (jobId) next.set('job', jobId);
    setSearchParams(next, { replace: true });
  };

  const initialApplicantsJobId = searchParams.get('job') || '';

  const inst = faculty?.institution;
  const notLinked = faculty && !inst;

  const nav = SECTIONS.map(s => {
    if (s.key === 'my-jobs' && postingCounts.jobs) return { ...s, badge: postingCounts.jobs };
    if (s.key === 'my-opportunities' && postingCounts.opportunities)
      return { ...s, badge: postingCounts.opportunities };
    if (s.key === 'applicants' && postingCounts.applicants)
      return { ...s, badge: postingCounts.applicants };
    if (s.key === 'roster' && pendingFacultyCount)
      return { ...s, badge: pendingFacultyCount };
    return s;
  });

  return (
    <AdminShell
      accent={ACCENT}
      consoleLabel="College Admin"
      consoleSublabel={inst?.name || 'No institution linked'}
      nav={nav}
      activeKey={activeSection}
      onSelect={setSection}
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {loading && <div className="text-text-muted text-sm">Loading…</div>}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {notLinked && !loading && (
          <Alert variant="destructive">
            <AlertDescription>
              Your account is a College Admin but no institution is linked. Ask a Platform Admin to
              promote you again with a valid <code>--domain</code>.
            </AlertDescription>
          </Alert>
        )}

        {!loading && inst && (
          <>
            {activeSection === 'overview' && <CollegeOverview onOpenSection={setSection} />}
            {activeSection === 'institution' && <InstitutionSection inst={inst} user={faculty} />}
            {activeSection === 'post-opportunity' && (
              <PostOpportunityForm onCreated={() => setSection('my-opportunities')} />
            )}
            {activeSection === 'my-opportunities' && (
              <MyOpportunitiesList onPostNew={() => setSection('post-opportunity')} />
            )}
            {activeSection === 'post-job' && <PostJobForm onCreated={() => setSection('my-jobs')} />}
            {activeSection === 'my-jobs' && <MyJobsList onOpenApplicants={openApplicantsFor} />}
            {activeSection === 'applicants' && (
              <ApplicantsKanban initialJobId={initialApplicantsJobId} />
            )}
            {activeSection === 'invite-faculty' && (
              <InviteFacultyForm
                onInvited={() => {
                  // Refresh badge count when a new invite lands.
                  listPendingFaculty()
                    .then(r => setPendingFacultyCount(r.faculty?.length || 0))
                    .catch(() => {});
                }}
              />
            )}
            {activeSection === 'roster' && <FacultyRoster />}
          </>
        )}
      </div>
    </AdminShell>
  );
}
