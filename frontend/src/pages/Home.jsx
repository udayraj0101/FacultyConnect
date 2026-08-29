import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Briefcase,
  UsersRound,
  Sparkles,
  Bookmark,
  Handshake,
  CalendarClock,
  ArrowRight,
  BadgeCheck,
  ShieldAlert,
  Link as LinkIcon,
  Download,
} from 'lucide-react';
import HeroBanner from '../components/dashboard/HeroBanner';
import StatCard from '../components/dashboard/StatCard';
import SectionCard from '../components/dashboard/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonList, SkeletonCard } from '../components/ui/Skeleton';
import { Alert, AlertDescription } from '../components/ui/Alert';
import MyApplicationsWidget from '../components/profile/MyApplicationsWidget';
import MyBookmarksWidget from '../components/profile/MyBookmarksWidget';
import ConnectRequestsWidget from '../components/home/ConnectRequestsWidget';
import { useProfile } from '../hooks/useProfile';
import { listMyBookmarks } from '../services/opportunity.service';
import { listMyApplications } from '../services/job.service';
import { getConnectRequestsSummary } from '../services/connectRequest.service';

const QUICK_ACTIONS = [
  {
    to: '/discover',
    icon: Search,
    color: '#00B894',
    title: 'Find opportunities',
    body: 'FDPs, conferences, grants and UGC-CARE journals — filtered to what matches your domain.',
  },
  {
    to: '/jobs',
    icon: Briefcase,
    color: '#1A237E',
    title: 'Explore faculty roles',
    body: "Openings at verified colleges. Apply in one click with your ORCID-populated profile.",
  },
  {
    to: '/directory',
    icon: UsersRound,
    color: '#6C5CE7',
    title: 'Search the directory',
    body: "Find collaborators by domain or institution. Send a structured connect request.",
  },
];

function firstName(fullName) {
  if (!fullName) return 'there';
  const parts = fullName
    .replace(/^Dr\.?\s+/i, '')
    .replace(/^Prof\.?\s+/i, '')
    .trim()
    .split(/\s+/);
  return parts[0] || 'there';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function DeadlinesWidget({ bookmarks, loading }) {
  const upcoming = useMemo(() => {
    return (bookmarks || [])
      .filter(b => b.deadline && new Date(b.deadline).getTime() > Date.now())
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);
  }, [bookmarks]);

  return (
    <SectionCard
      title="Upcoming deadlines"
      subtitle="Based on what you've bookmarked"
      trailing={
        upcoming.length > 0 && (
          <Link to="/discover" className="text-xs font-semibold text-primary hover:underline">
            All opportunities →
          </Link>
        )
      }
    >
      {loading ? (
        <SkeletonList count={2} cardLines={1} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={18} />}
          title="No upcoming deadlines"
          description="Bookmark opportunities on the Discover feed and their deadlines will surface here."
          action={
            <Link
              to="/discover"
              className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
            >
              Browse Discover <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {upcoming.map(opp => {
            const days = daysUntil(opp.deadline);
            const urgent = days <= 7;
            const verified =
              opp.verificationBadge === 'ugc_care_verified' ||
              opp.verificationBadge === 'scopus_indexed';
            return (
              <div key={opp.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-light truncate">{opp.title}</div>
                  <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                    {verified ? (
                      <BadgeCheck size={12} className="text-success" />
                    ) : (
                      <ShieldAlert size={12} className="text-text-muted" />
                    )}
                    <span className="truncate">{opp.organizerName}</span>
                  </div>
                </div>
                <div
                  className={`shrink-0 text-right ${urgent ? 'text-danger' : 'text-text-muted'}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide">
                    {days === 0 ? 'Today' : `${days}d left`}
                  </div>
                  <div className="text-[10px] mt-0.5">
                    {new Date(opp.deadline).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function QuickActionsCard({ orcidLinked, onConnectOrcid, onExportCv }) {
  const [busy, setBusy] = useState({ orcid: false, cv: false });

  const runConnect = async () => {
    if (orcidLinked) return;
    setBusy(b => ({ ...b, orcid: true }));
    try {
      await onConnectOrcid();
    } catch {
      setBusy(b => ({ ...b, orcid: false }));
    }
  };
  const runCv = async () => {
    setBusy(b => ({ ...b, cv: true }));
    try {
      await onExportCv();
    } finally {
      setBusy(b => ({ ...b, cv: false }));
    }
  };

  return (
    <SectionCard title="Quick actions" subtitle="One tap away">
      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={runConnect}
          disabled={orcidLinked || busy.orcid}
          className={`w-full text-left rounded-lg border px-3 py-2.5 flex items-center gap-3 transition-all ${
            orcidLinked
              ? 'border-success/30 bg-success/5 cursor-default'
              : 'border-border hover:border-primary/40 hover:bg-primary/5'
          }`}
        >
          <span
            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
              orcidLinked ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
            }`}
          >
            <LinkIcon size={15} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-text-light">
              {orcidLinked ? 'ORCID connected' : busy.orcid ? 'Redirecting…' : 'Connect ORCID'}
            </span>
            <span className="block text-[11px] text-text-muted mt-0.5">
              {orcidLinked
                ? 'Publications auto-sync nightly'
                : 'One-time auth — pulls publications and employment'}
            </span>
          </span>
        </button>
        <button
          onClick={runCv}
          disabled={busy.cv}
          className="w-full text-left rounded-lg border border-border px-3 py-2.5 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <span className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <Download size={15} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-text-light">
              {busy.cv ? 'Generating…' : 'Download CV (PDF)'}
            </span>
            <span className="block text-[11px] text-text-muted mt-0.5">
              Formatted for job applications
            </span>
          </span>
        </button>
        <Link
          to="/profile"
          className="w-full text-left rounded-lg border border-border px-3 py-2.5 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <span className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <Sparkles size={15} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold text-text-light">Complete your profile</span>
            <span className="block text-[11px] text-text-muted mt-0.5">
              Add domain tags, publications, visibility settings
            </span>
          </span>
        </Link>
      </div>
    </SectionCard>
  );
}

export default function Home() {
  const profile = useProfile();
  const [bookmarks, setBookmarks] = useState([]);
  const [applications, setApplications] = useState([]);
  const [reqSummary, setReqSummary] = useState({ pendingReceived: 0, pendingSent: 0 });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bm, apps, sum] = await Promise.all([
          listMyBookmarks().catch(() => []),
          listMyApplications().catch(() => []),
          getConnectRequestsSummary().catch(() => ({ pendingReceived: 0, pendingSent: 0 })),
        ]);
        if (!cancelled) {
          setBookmarks(bm);
          setApplications(apps);
          setReqSummary(sum);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (profile.loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <SkeletonCard lines={3} className="h-40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} className="h-24" />
          ))}
        </div>
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (profile.error && !profile.faculty) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{profile.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile.faculty) return null;

  const { faculty } = profile;
  const activeApps = applications.filter(a => a.status !== 'closed').length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title={`${greeting()}, ${firstName(faculty.name)}`}
        subtitle={
          faculty.institution?.name
            ? `${faculty.designation === 'Professor' ? 'Professor' : faculty.designation + ' Professor'} · ${faculty.institution.name}`
            : "Your professional home for verified academic opportunities and collaboration."
        }
        emoji="👋"
        gradient="linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)"
        stats={[
          {
            icon: <Handshake size={18} />,
            value: reqSummary.pendingReceived || 0,
            label: 'Pending requests',
          },
          { icon: <Briefcase size={18} />, value: activeApps, label: 'Active applications' },
          { icon: <Bookmark size={18} />, value: bookmarks.length, label: 'Bookmarks' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.to}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
            >
              <Link
                to={action.to}
                className="group block h-full rounded-xl border border-border bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}15`, color: action.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </div>
                <div className="mt-3 text-base font-bold text-secondary leading-snug">
                  {action.title}
                </div>
                <div className="mt-1 text-xs text-text-muted leading-relaxed">{action.body}</div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DeadlinesWidget bookmarks={bookmarks} loading={dataLoading} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MyApplicationsWidget />
            <MyBookmarksWidget />
          </div>
        </div>
        <div className="space-y-4">
          <ConnectRequestsWidget />
          <QuickActionsCard
            orcidLinked={Boolean(faculty.orcidId)}
            onConnectOrcid={profile.connectOrcid}
            onExportCv={profile.exportCv}
          />
        </div>
      </div>
    </div>
  );
}
