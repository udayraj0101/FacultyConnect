import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  Quote,
  TrendingUp,
  Award,
  FileText,
  Link as LinkIcon,
  GraduationCap,
  IndianRupee,
  Globe,
  Linkedin,
  BookOpen,
  Github,
  Twitter,
  ArrowRight,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { SkeletonCard } from '../components/ui/Skeleton';
import StatCard from '../components/dashboard/StatCard';
import SectionCard from '../components/dashboard/SectionCard';
import HeroBanner from '../components/dashboard/HeroBanner';
import { getPublicProfile } from '../services/faculty.service';
import { useSeoMeta } from '../hooks/useSeoMeta';

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .join('')
    .toUpperCase();
}

function formatAmount(amount) {
  if (typeof amount !== 'number' || amount <= 0) return '';
  if (amount >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs. ${(amount / 100_000).toFixed(2)} L`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

function displayRange(from, to, current) {
  if (!from && !to && !current) return '';
  const start = from || '?';
  const end = current ? 'Present' : to || '?';
  return `${start} – ${end}`;
}

function SectionHeading({ label }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted pt-2">{label}</h2>
  );
}

const LINK_META = {
  website: { label: 'Website', Icon: Globe },
  linkedin: { label: 'LinkedIn', Icon: Linkedin },
  googleScholar: { label: 'Google Scholar', Icon: BookOpen },
  github: { label: 'GitHub', Icon: Github },
  twitter: { label: 'X / Twitter', Icon: Twitter },
};

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Anonymous top strip for the public/SEO profile view. Deliberately
 * lightweight — visitors haven't authenticated, so no user menu, no
 * discover/directory nav. Just the brand + a sign-in call to action.
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

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getPublicProfile(id)
      .then(p => {
        if (!cancelled) setProfile(p);
      })
      .catch(err => {
        if (!cancelled) {
          const status = err.response?.status;
          if (status === 404) {
            setError('This profile is not publicly available.');
          } else {
            setError(err.response?.data?.error?.message || 'Failed to load profile');
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

  const canonical = typeof window !== 'undefined' ? `${window.location.origin}/f/${id}` : '';

  const seoDescription = useMemo(() => {
    if (!profile) return '';
    const designation =
      profile.designation === 'Professor' ? 'Professor' : `${profile.designation} Professor`;
    const inst = profile.institution?.name ? ` at ${profile.institution.name}` : '';
    const areas =
      profile.domainTags?.length > 0 ? ` Research areas: ${profile.domainTags.slice(0, 5).join(', ')}.` : '';
    const bioSnippet = profile.bio ? ` ${profile.bio.slice(0, 160)}${profile.bio.length > 160 ? '…' : ''}` : '';
    return `${profile.name}, ${designation}${inst}.${areas}${bioSnippet}`.trim();
  }, [profile]);

  const jsonLd = useMemo(() => {
    if (!profile) return null;
    const sameAs = Object.values(profile.externalLinks || {}).filter(Boolean);
    if (profile.orcidId) sameAs.push(`https://orcid.org/${profile.orcidId}`);
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      jobTitle:
        profile.designation === 'Professor' ? 'Professor' : `${profile.designation} Professor`,
      description: profile.bio || undefined,
      knowsAbout: profile.domainTags?.length ? profile.domainTags : undefined,
      affiliation: profile.institution
        ? {
            '@type': 'CollegeOrUniversity',
            name: profile.institution.name,
          }
        : undefined,
      identifier: profile.orcidId
        ? { '@type': 'PropertyValue', propertyID: 'ORCID', value: profile.orcidId }
        : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
      url: canonical || undefined,
    };
  }, [profile, canonical]);

  useSeoMeta({
    title: profile
      ? `${profile.name} · ${profile.institution?.name || 'FacultyConnect'}`
      : loading
        ? 'Loading profile · FacultyConnect'
        : 'Profile not found · FacultyConnect',
    description: seoDescription,
    canonical,
    ogTitle: profile?.name ? `${profile.name} — Academic profile` : undefined,
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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-bg-dark">
        <PublicTopBar />
        <div className="max-w-3xl mx-auto p-6 sm:p-10">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Profile unavailable.'}</AlertDescription>
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

  const designation =
    profile.designation === 'Professor' ? 'Professor' : `${profile.designation} Professor`;
  const institutionVerified = profile.institution?.verificationStatus === 'verified';

  const subtitle = (
    <>
      <span>{designation}</span>
      {profile.department && (
        <>
          <span className="mx-2 opacity-60">·</span>
          <span>{profile.department}</span>
        </>
      )}
      {profile.institution?.name && (
        <>
          <span className="mx-2 opacity-60">·</span>
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} /> {profile.institution.name}
          </span>
          {institutionVerified && (
            <span className="ml-2 inline-flex items-center gap-1 bg-white/20 border border-white/20 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider align-middle">
              <BadgeCheck size={11} /> Verified
            </span>
          )}
        </>
      )}
    </>
  );

  const populatedLinks = Object.entries(LINK_META).filter(
    ([key]) => profile.externalLinks?.[key],
  );

  const sortedEmployment = [...(profile.employmentHistory || [])].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    return (b.to || 9999) - (a.to || 9999);
  });
  const sortedEducation = [...(profile.education || [])].sort(
    (a, b) => (b.year || 0) - (a.year || 0),
  );
  const sortedAwards = [...(profile.awards || [])].sort(
    (a, b) => (b.year || 0) - (a.year || 0),
  );
  const sortedGrants = [...(profile.grantsReceived || [])].sort(
    (a, b) => (b.year || 0) - (a.year || 0),
  );

  return (
    <div className="min-h-screen bg-bg-dark">
      <PublicTopBar />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <HeroBanner
          avatar={initialsOf(profile.name)}
          title={profile.name}
          subtitle={subtitle}
          actions={
            <>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-white/95 text-primary font-semibold rounded-md px-4 py-2 text-sm min-w-[200px] justify-center"
              >
                Sign in to connect <ArrowRight size={14} />
              </Link>
              <div className="text-[11px] opacity-80">
                Contact stays hidden until they accept your connect request.
              </div>
              {profile.orcidId && (
                <a
                  href={`https://orcid.org/${profile.orcidId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/85 hover:text-white"
                >
                  <LinkIcon size={12} /> ORCID iD {profile.orcidId}
                </a>
              )}
            </>
          }
        />

        {/* Metrics — suppress citation-derived numbers when we have no
            publications on file. See FC-05. */}
        {(() => {
          const unreconciled =
            profile.publicationCount === 0 &&
            (profile.citationCount || profile.hIndex || profile.i10Index);
          const val = raw => (unreconciled ? '—' : raw ?? 0);
          const sub = unreconciled ? 'Awaiting publications' : undefined;
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                index={0}
                icon={<Quote size={20} />}
                color="#6C5CE7"
                value={val(profile.citationCount)}
                label="Citations"
                sublabel={sub}
              />
              <StatCard
                index={1}
                icon={<TrendingUp size={20} />}
                color="#00B894"
                value={val(profile.hIndex)}
                label="h-index"
                sublabel={sub}
              />
              <StatCard
                index={2}
                icon={<Award size={20} />}
                color="#F59E0B"
                value={val(profile.i10Index)}
                label="i10-index"
                sublabel={sub}
              />
              <StatCard
                index={3}
                icon={<FileText size={20} />}
                color="#1A237E"
                value={profile.publicationCount}
                label="Publications"
              />
            </div>
          );
        })()}

        {/* ABOUT */}
        {(profile.bio || populatedLinks.length > 0) && (
          <section className="space-y-4">
            <SectionHeading label="About" />
            {profile.bio && (
              <SectionCard title="Professional bio">
                <p className="text-sm text-text-light leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </SectionCard>
            )}
            {populatedLinks.length > 0 && (
              <SectionCard title="External links">
                <ul className="flex flex-wrap gap-2">
                  {populatedLinks.map(([key, meta]) => {
                    const url = profile.externalLinks[key];
                    const Icon = meta.Icon;
                    return (
                      <li key={key}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-2 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border px-3 py-1.5 text-xs font-medium text-text-light"
                        >
                          <Icon size={13} />
                          <span>{meta.label}</span>
                          <span className="text-text-muted">·</span>
                          <span className="text-text-muted truncate max-w-[180px]">
                            {domainOf(url)}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            )}
          </section>
        )}

        {/* RESEARCH */}
        {profile.domainTags?.length > 0 && (
          <section className="space-y-4">
            <SectionHeading label="Research" />
            <SectionCard title="Research areas">
              <div className="flex flex-wrap gap-2">
                {profile.domainTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </SectionCard>
          </section>
        )}

        {/* CAREER */}
        {(sortedEmployment.length > 0 || sortedEducation.length > 0) && (
          <section className="space-y-4">
            <SectionHeading label="Career" />
            {sortedEmployment.length > 0 && (
              <SectionCard title="Employment history">
                <ol className="space-y-4">
                  {sortedEmployment.map(it => (
                    <li key={it.id} className="relative pl-4 border-l-2 border-primary/30">
                      <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-primary" />
                      <div className="text-sm font-bold text-text-light">
                        {it.designation || 'Faculty'}
                      </div>
                      <div className="text-sm text-text-light">{it.institution}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {displayRange(it.from, it.to, it.current)}
                        {it.current && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>
                      {it.description && (
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          {it.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </SectionCard>
            )}
            {sortedEducation.length > 0 && (
              <SectionCard title="Education">
                <ul className="space-y-3">
                  {sortedEducation.map(it => (
                    <li key={it.id} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-text-light">
                          {it.degree}
                          {it.field ? ` in ${it.field}` : ''}
                        </div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {it.institution}
                          {it.institution && it.year ? ' · ' : ''}
                          {it.year || ''}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </section>
        )}

        {/* IMPACT */}
        {(sortedAwards.length > 0 || sortedGrants.length > 0) && (
          <section className="space-y-4">
            <SectionHeading label="Impact" />
            {sortedAwards.length > 0 && (
              <SectionCard title="Awards & recognitions">
                <ul className="space-y-3">
                  {sortedAwards.map(it => (
                    <li key={it.id} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Award size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-text-light">{it.title}</div>
                        {it.year && <div className="text-xs text-text-muted mt-0.5">{it.year}</div>}
                        {it.description && (
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            {it.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
            {sortedGrants.length > 0 && (
              <SectionCard title="Grants received">
                <ul className="space-y-3">
                  {sortedGrants.map(it => (
                    <li key={it.id} className="rounded-md border border-border bg-white p-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-text-light">{it.title}</div>
                          <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                            {it.agency && <span>{it.agency}</span>}
                            {it.agency && it.year ? <span>·</span> : null}
                            {it.year && <span>{it.year}</span>}
                            {it.ongoing && (
                              <span className="inline-flex items-center rounded-full bg-success/10 text-success border border-success/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                Ongoing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                            {it.role}
                          </span>
                          {typeof it.amount === 'number' && it.amount > 0 && (
                            <div className="text-xs font-semibold text-text-light mt-1 inline-flex items-center gap-0.5">
                              <IndianRupee size={11} />
                              {formatAmount(it.amount).replace(/^Rs\.\s?/, '')}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </section>
        )}

        {/* PUBLICATIONS */}
        <section className="space-y-4">
          <SectionHeading label="Publications" />
          <SectionCard
            title="Publications"
            subtitle={`${profile.publicationCount} total · showing the most recent ${Math.min(profile.publications.length, 20)}`}
          >
            {profile.publications.length === 0 ? (
              <div className="text-sm text-text-muted italic text-center py-6">
                No publications on file.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {profile.publications.map(pub => (
                  <div key={pub.id} className="py-4">
                    <div className="font-semibold text-text-light">{pub.title}</div>
                    {pub.authors?.length > 0 && (
                      <div className="text-sm text-text-muted mt-1">
                        {pub.authors.slice(0, 6).join(', ')}
                        {pub.authors.length > 6 ? ` +${pub.authors.length - 6} more` : ''}
                      </div>
                    )}
                    <div className="text-sm text-text-muted mt-1">
                      {pub.venue ? <span className="italic">{pub.venue}</span> : null}
                      {pub.venue && pub.year ? ' · ' : ''}
                      {pub.year || ''}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                      {typeof pub.citationCount === 'number' && pub.citationCount > 0 && (
                        <span className="text-text-muted">
                          Cited by{' '}
                          <span className="font-semibold text-text-light">{pub.citationCount}</span>
                        </span>
                      )}
                      {pub.doi && (
                        <a
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          DOI {pub.doi}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        {/* Footer CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 p-5 sm:p-6 text-center space-y-2">
          <div className="text-lg sm:text-xl font-bold text-secondary">
            Are you a faculty member?
          </div>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            Join FacultyConnect to build your own profile, discover verified FDPs and journal
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
