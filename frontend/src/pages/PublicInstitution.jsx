import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  BadgeCheck,
  Quote,
  TrendingUp,
  IndianRupee,
  Users,
  Briefcase,
  MapPin,
  CalendarClock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { SkeletonCard } from '../components/ui/Skeleton';
import StatCard from '../components/dashboard/StatCard';
import SectionCard from '../components/dashboard/SectionCard';
import HeroBanner from '../components/dashboard/HeroBanner';
import { getPublicInstitution } from '../services/faculty.service';
import { useSeoMeta } from '../hooks/useSeoMeta';

function initialsOf(name) {
  return (name || 'I')
    .split(/\s+/)
    .slice(0, 3)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

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

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

const DESIGNATION_COLOR = {
  Assistant: '#6C5CE7',
  Associate: '#00B894',
  Professor: '#1A237E',
  Guest: '#F59E0B',
  Research: '#64748B',
};

const EMPLOYMENT_TYPE_META = {
  regular: { label: 'Regular', tone: 'bg-success/10 text-success border-success/30' },
  tenure_track: { label: 'Tenure-track', tone: 'bg-primary/10 text-primary border-primary/30' },
  contract: { label: 'Contract', tone: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  visiting: { label: 'Visiting', tone: 'bg-muted text-text-muted border-border' },
};

/**
 * Anonymous top strip — mirrors PublicProfile.PublicTopBar. Kept
 * separate rather than shared because both pages are so tiny that a
 * shared layout wrapper adds more complexity than it saves.
 */
function PublicTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
            FC
          </div>
          <div className="font-extrabold text-secondary text-base tracking-tight hidden sm:block">
            FacultyConnect
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-text-muted hover:text-text-light px-3 py-1.5 rounded-md"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-md"
          >
            Join FacultyConnect
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function PublicInstitution() {
  const { id } = useParams();
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPublicInstitution(id)
      .then(data => {
        if (!cancelled) setInstitution(data);
      })
      .catch(err => {
        if (!cancelled) {
          const status = err.response?.status;
          if (status === 404) {
            setError('This institution page is not available.');
          } else {
            setError(err.response?.data?.error?.message || 'Failed to load institution');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canonical =
    typeof window !== 'undefined'
      ? `${window.location.origin}/inst/${institution?.publicHandle || id}`
      : '';

  const seoDescription = useMemo(() => {
    if (!institution) return '';
    const facultyLine =
      institution.stats.verifiedFacultyCount > 0
        ? `${institution.stats.verifiedFacultyCount} verified faculty`
        : '';
    const jobsLine =
      institution.stats.openJobsCount > 0 ? `${institution.stats.openJobsCount} open positions` : '';
    const domainsLine =
      institution.topDomains.length > 0
        ? `Research areas: ${institution.topDomains.slice(0, 5).map(d => d.tag).join(', ')}.`
        : '';
    return `${institution.name}. ${[facultyLine, jobsLine].filter(Boolean).join(' · ')}. ${domainsLine}`
      .trim()
      .replace(/\s+/g, ' ');
  }, [institution]);

  const jsonLd = useMemo(() => {
    if (!institution) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'CollegeOrUniversity',
      name: institution.name,
      url: canonical || undefined,
      identifier: institution.aisheCode
        ? { '@type': 'PropertyValue', propertyID: 'AISHE', value: institution.aisheCode }
        : undefined,
      description: seoDescription || undefined,
    };
  }, [institution, canonical, seoDescription]);

  useSeoMeta({
    title: institution
      ? `${institution.name} · FacultyConnect`
      : loading
        ? 'Loading institution · FacultyConnect'
        : 'Institution not found · FacultyConnect',
    description: seoDescription,
    canonical,
    ogTitle: institution?.name,
    jsonLd,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark">
        <PublicTopBar />
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="min-h-screen bg-bg-dark">
        <PublicTopBar />
        <div className="max-w-3xl mx-auto p-6 sm:p-10">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Institution unavailable.'}</AlertDescription>
          </Alert>
          <div className="mt-6 text-sm text-text-muted">
            <Link to="/" className="text-primary font-semibold hover:underline">
              Go to FacultyConnect →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = institution.verificationStatus === 'verified';
  const heroSubtitle = (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="inline-flex items-center gap-1">
        <Building2 size={13} /> {institution.domain}
      </span>
      {isVerified && (
        <span className="inline-flex items-center gap-1 bg-white/20 border border-white/20 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          <BadgeCheck size={11} /> Verified institution
        </span>
      )}
      {institution.aisheCode && (
        <span className="inline-flex items-center gap-1 text-xs opacity-90">
          AISHE {institution.aisheCode}
        </span>
      )}
    </div>
  );

  const s = institution.stats;

  return (
    <div className="min-h-screen bg-bg-dark">
      <PublicTopBar />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <HeroBanner
          avatar={initialsOf(institution.name)}
          title={institution.name}
          subtitle={heroSubtitle}
          actions={
            <>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-white/95 text-primary font-semibold rounded-md px-4 py-2 text-sm min-w-[200px] justify-center"
              >
                Join FacultyConnect <ArrowRight size={14} />
              </Link>
              <div className="text-[11px] opacity-80">
                Faculty at this institution can claim their profile in minutes.
              </div>
            </>
          }
        />

        {/* Research rollup — same 4 tiles as CA Overview, verified-only. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            index={0}
            icon={<Users size={20} />}
            color="#6C5CE7"
            value={s.verifiedFacultyCount}
            label="Verified faculty"
          />
          <StatCard
            index={1}
            icon={<Quote size={20} />}
            color="#00B894"
            value={formatCount(s.totalCitations)}
            label="Total citations"
          />
          <StatCard
            index={2}
            icon={<TrendingUp size={20} />}
            color="#F59E0B"
            value={s.avgHIndex}
            label="Avg h-index"
            sublabel={s.maxHIndex ? `max ${s.maxHIndex}` : undefined}
          />
          <StatCard
            index={3}
            icon={<IndianRupee size={20} />}
            color="#1A237E"
            value={formatInr(s.totalGrantValue).replace(/^₹/, '₹')}
            label="Grants received"
          />
        </div>

        {/* Open jobs — mini list; full apply-page still available via /jobs */}
        {institution.openJobs.length > 0 && (
          <SectionCard
            title="Open positions"
            subtitle={`${institution.openJobs.length} live posting${institution.openJobs.length === 1 ? '' : 's'} · Apply on the Job Board`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {institution.openJobs.map(job => {
                const color = DESIGNATION_COLOR[job.designation] || '#6C5CE7';
                const days = daysUntil(job.deadline);
                const empMeta = EMPLOYMENT_TYPE_META[job.employmentType];
                return (
                  <Link
                    key={job.id}
                    to="/login"
                    state={{ from: `/jobs?job=${job.id}` }}
                    className="relative rounded-xl bg-white border border-border hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden block"
                  >
                    <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
                    <div className="pl-4 pr-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-text-light leading-tight">
                            {job.title}
                          </div>
                          <div className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                            <span>{job.department}</span>
                            {empMeta && (
                              <span
                                className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${empMeta.tone}`}
                              >
                                {empMeta.label}
                              </span>
                            )}
                            {job.location && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin size={10} /> {job.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {job.designation}
                        </span>
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] mt-2 ${
                          days <= 7 ? 'text-danger font-semibold' : 'text-text-muted'
                        }`}
                      >
                        <CalendarClock size={11} />
                        {new Date(job.deadline).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {days > 0 && ` · ${days}d left`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Research areas — chip cloud from topDomains */}
        {institution.topDomains.length > 0 && (
          <SectionCard
            title="Research areas"
            subtitle="Domains present across the verified roster"
          >
            <div className="flex flex-wrap gap-2">
              {institution.topDomains.map(d => (
                <span
                  key={d.tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-medium"
                >
                  {d.tag}
                  <span className="tabular-nums text-[11px] bg-primary/20 rounded-full px-1.5 py-0.5">
                    {d.count}
                  </span>
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Verified faculty — public directory */}
        {institution.faculty.length > 0 && (
          <SectionCard
            title="Faculty"
            subtitle={`${institution.faculty.length} publicly listed · ranked by h-index`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {institution.faculty.map(f => {
                const inner = (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      {initialsOf(f.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-text-light flex items-center gap-1.5 truncate">
                        {f.name}
                        {f.publicHandle && (
                          <ExternalLink size={11} className="text-primary opacity-70 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-text-muted">
                        {f.designation === 'Professor'
                          ? 'Professor'
                          : `${f.designation} Professor`}
                        {f.department ? ` · ${f.department}` : ''}
                      </div>
                      {f.domainTags.length > 0 && (
                        <div className="text-[11px] text-text-muted mt-1 truncate">
                          {f.domainTags.slice(0, 3).join(' · ')}
                        </div>
                      )}
                      <div className="text-[11px] text-text-muted mt-1 flex items-center gap-2">
                        <span>Citations {f.citationCount}</span>
                        <span>·</span>
                        <span>h {f.hIndex}</span>
                      </div>
                    </div>
                  </>
                );
                return f.publicHandle ? (
                  <Link
                    key={f.id}
                    to={`/f/${f.publicHandle}`}
                    className="flex items-start gap-3 rounded-lg border border-border bg-white p-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={f.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-white p-3"
                    title="This faculty hasn't opted their profile in for public display"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Empty state — new institution, nothing to show */}
        {institution.openJobs.length === 0 &&
          institution.faculty.length === 0 &&
          institution.topDomains.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center">
              <div className="text-sm font-semibold text-text-light">
                No public activity yet
              </div>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                Faculty at this institution haven't opted their profiles in for public
                display, and no active postings are currently open.
              </p>
            </div>
          )}

        {/* Footer CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 p-5 sm:p-6 text-center space-y-2">
          <div className="text-lg sm:text-xl font-bold text-secondary">
            Are you a faculty member at {institution.name}?
          </div>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            Join FacultyConnect to build your profile, discover verified FDPs and journal
            CFPs, and collaborate with peers across Indian institutions.
          </p>
          <div className="pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-md px-5 py-2.5 text-sm"
            >
              Create your profile <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
