import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Megaphone,
  Briefcase,
  ShieldCheck,
  ClipboardList,
  Flag,
  AlertTriangle,
} from 'lucide-react';
import HeroBanner from '../dashboard/HeroBanner';
import StatCard from '../dashboard/StatCard';
import BreakdownBar from '../dashboard/BreakdownBar';
import DataTable from '../dashboard/DataTable';
import SectionCard from '../dashboard/SectionCard';
import { SkeletonList } from '../ui/Skeleton';
import { Alert, AlertDescription } from '../ui/Alert';
import { getPlatformOverview } from '../../services/admin.service';
import { getReportsSummary } from '../../services/report.service';

const VERIF_PILL = {
  verified: 'bg-success/10 text-success border-success/30',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  rejected: 'bg-danger/10 text-danger border-danger/30',
};

const ROLE_COLORS = {
  Faculty: '#00B894',
  CollegeAdmin: '#6C5CE7',
  OpportunityOrganizer: '#F59E0B',
  PlatformAdmin: '#1A237E',
};

const OPP_COLORS = {
  fdp: '#6C5CE7',
  conference: '#00B894',
  grant: '#F59E0B',
  journal: '#1A237E',
};

const BADGE_COLORS = {
  ugc_care_verified: '#00B894',
  scopus_indexed: '#6C5CE7',
  unverified: '#64748B',
};

const ROLE_LABEL = {
  Faculty: 'Faculty',
  CollegeAdmin: 'College Admins',
  OpportunityOrganizer: 'Organizers',
  PlatformAdmin: 'Platform Admins',
};

const OPP_LABEL = {
  fdp: 'FDPs',
  conference: 'Conferences',
  grant: 'Grants',
  journal: 'Journals',
};

const BADGE_LABEL = {
  ugc_care_verified: 'UGC-CARE Verified',
  scopus_indexed: 'Scopus Indexed',
  unverified: 'Unverified',
};

function makeItems(map, keyToColor, keyToLabel) {
  return Object.entries(map || {}).map(([key, value]) => ({
    label: keyToLabel[key] || key,
    value,
    color: keyToColor[key] || '#64748B',
  }));
}

export default function PlatformOverview({ onOpenSection }) {
  const [data, setData] = useState(null);
  const [reports, setReports] = useState({ open: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overview, reportsSummary] = await Promise.all([
          getPlatformOverview(),
          getReportsSummary().catch(() => ({ open: 0, overdue: 0 })),
        ]);
        if (!cancelled) {
          setData(overview);
          setReports(reportsSummary);
        }
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

  const { counts, verifications, institutionHealth, breakdowns, recentInstitutions } = data;

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Trust & Safety Console"
        subtitle="Platform-wide moderation, verification, and integrity oversight."
        emoji="🛡"
        gradient="linear-gradient(135deg, #1A237E 0%, #4C4FE0 100%)"
        stats={[
          { icon: <ShieldCheck size={18} />, value: verifications.pending, label: 'Pending reviews' },
          { icon: <Flag size={18} />, value: reports.open, label: 'Open reports' },
          { icon: <Building2 size={18} />, value: institutionHealth.verified, label: 'Verified institutions' },
        ]}
      />

      {reports.overdue > 0 && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>
                <span className="font-semibold">{reports.overdue}</span> grievance
                {reports.overdue === 1 ? '' : 's'} past the 72-hour SLA.
              </span>
            </span>
            <button
              onClick={() => onOpenSection?.('reports')}
              className="text-xs font-semibold underline"
            >
              Review now →
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          index={0}
          icon={<Building2 size={20} />}
          color="#6C5CE7"
          value={counts.institutions}
          label="Institutions"
          sublabel={`${institutionHealth.verified} verified · ${institutionHealth.unverified} unverified`}
        />
        <StatCard
          index={1}
          icon={<Users size={20} />}
          color="#00B894"
          value={counts.faculty}
          label="Registered accounts"
          sublabel="Across all roles"
        />
        <StatCard
          index={2}
          icon={<Megaphone size={20} />}
          color="#F59E0B"
          value={counts.opportunities}
          label="Live opportunities"
          sublabel={`${counts.jobs} open jobs`}
        />
        <StatCard
          index={3}
          icon={<ClipboardList size={20} />}
          color="#1A237E"
          value={counts.publications}
          label="Publications on file"
          sublabel="Imported from ORCID / Scholar / manual"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          className="lg:col-span-2"
          title="Recently registered institutions"
          subtitle="Latest tenants signed up on the platform"
          trailing={
            <button
              onClick={() => onOpenSection?.('verifications')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Verification queue →
            </button>
          }
        >
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Institution',
                render: r => (
                  <div>
                    <div className="font-semibold text-text-light">{r.name}</div>
                    <div className="text-xs text-text-muted">{r.domain}</div>
                  </div>
                ),
              },
              {
                key: 'subscriptionTier',
                label: 'Tier',
                render: r => (
                  <span className="text-xs font-semibold uppercase text-text-muted">
                    {r.subscriptionTier}
                  </span>
                ),
              },
              {
                key: 'verificationStatus',
                label: 'Status',
                render: r => (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${VERIF_PILL[r.verificationStatus]}`}
                  >
                    {r.verificationStatus}
                  </span>
                ),
              },
              {
                key: 'createdAt',
                label: 'Registered',
                render: r => (
                  <span className="text-xs text-text-muted">
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                ),
              },
            ]}
            rows={recentInstitutions}
            emptyLabel="No institutions registered yet."
          />
        </SectionCard>

        <div className="space-y-4">
          <BreakdownBar
            title="Accounts by role"
            items={makeItems(breakdowns.facultyByRole, ROLE_COLORS, ROLE_LABEL)}
            total={counts.faculty || 1}
          />
          <BreakdownBar
            title="Verification queue"
            items={[
              { label: 'Pending', value: verifications.pending, color: '#F59E0B' },
              { label: 'Approved', value: verifications.approved, color: '#00B894' },
              { label: 'Rejected', value: verifications.rejected, color: '#F43F5E' },
            ]}
            total={
              verifications.pending + verifications.approved + verifications.rejected || 1
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownBar
          title="Opportunities by type"
          items={makeItems(breakdowns.opportunitiesByType, OPP_COLORS, OPP_LABEL)}
          total={counts.opportunities || 1}
        />
        <BreakdownBar
          title="Opportunities by verification badge"
          items={makeItems(breakdowns.opportunitiesByBadge, BADGE_COLORS, BADGE_LABEL)}
          total={counts.opportunities || 1}
        />
      </div>
    </div>
  );
}
