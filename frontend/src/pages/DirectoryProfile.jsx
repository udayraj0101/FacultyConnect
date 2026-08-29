import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Quote,
  TrendingUp,
  Award,
  FileText,
  MessageSquarePlus,
  Link as LinkIcon,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  GraduationCap,
  IndianRupee,
  Globe,
  Linkedin,
  BookOpen,
  Github,
  Twitter,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import StatCard from '../components/dashboard/StatCard';
import SectionCard from '../components/dashboard/SectionCard';
import HeroBanner from '../components/dashboard/HeroBanner';
import { getDirectoryProfile } from '../services/directory.service';
import ConnectRequestModal from '../components/directory/ConnectRequestModal';

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

export default function DirectoryProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = () => {
    setLoading(true);
    return getDirectoryProfile(id)
      .then(p => setProfile(p))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDirectoryProfile(id)
      .then(p => {
        if (!cancelled) setProfile(p);
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Profile unavailable.'}</AlertDescription>
        </Alert>
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-light"
      >
        <ArrowLeft size={16} /> Back to directory
      </button>

      <HeroBanner
        avatar={initialsOf(profile.name)}
        title={profile.name}
        subtitle={subtitle}
        actions={
          <>
            <ConnectionCta profile={profile} onOpenModal={() => setModalOpen(true)} />
            {profile.orcidId && (
              <a
                href={`https://sandbox.orcid.org/${profile.orcidId}`}
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

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          index={0}
          icon={<Quote size={20} />}
          color="#6C5CE7"
          value={profile.citationCount}
          label="Citations"
        />
        <StatCard
          index={1}
          icon={<TrendingUp size={20} />}
          color="#00B894"
          value={profile.hIndex}
          label="h-index"
        />
        <StatCard
          index={2}
          icon={<Award size={20} />}
          color="#F59E0B"
          value={profile.i10Index}
          label="i10-index"
        />
        <StatCard
          index={3}
          icon={<FileText size={20} />}
          color="#1A237E"
          value={profile.publicationCount}
          label="Publications"
        />
      </div>

      {/* ABOUT — bio + external links */}
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

      {/* Research areas */}
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

      {/* Career — employment + education */}
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

      {/* Impact — awards + grants */}
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
                      {it.year && (
                        <div className="text-xs text-text-muted mt-0.5">{it.year}</div>
                      )}
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

      {/* Publications */}
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

      {modalOpen && (
        <ConnectRequestModal
          toFaculty={profile}
          onClose={() => setModalOpen(false)}
          onSent={() => {
            setModalOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

const PURPOSE_LABEL = {
  co_author: 'Co-author a paper',
  phd_advisory: 'PhD advisory / co-supervision',
  joint_fdp: 'Host a joint FDP',
  guest_lecture: 'Guest lecture invitation',
  grant_collab: 'Grant collaboration',
  other: 'Other',
};

function ConnectionCta({ profile, onOpenModal }) {
  if (profile.isSelf) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md bg-white/15 border border-white/20 px-3 py-2 text-xs font-semibold">
        This is your public profile
      </div>
    );
  }
  const c = profile.myConnection;

  if (!c) {
    return (
      <>
        <Button
          onClick={onOpenModal}
          className="bg-white hover:bg-white/95 border-transparent text-primary font-semibold min-w-[200px] justify-center"
        >
          <MessageSquarePlus size={14} className="mr-2" />
          Send connect request
        </Button>
        <div className="text-[11px] opacity-80">Contact stays hidden until they accept.</div>
      </>
    );
  }

  if (c.status === 'pending') {
    const label =
      c.direction === 'sent' ? 'Request pending' : 'They sent you a request — check your inbox';
    return (
      <div className="inline-flex items-center gap-2 rounded-md bg-white/15 border border-white/20 px-3 py-2 text-xs font-semibold">
        <Clock size={14} /> {label}
      </div>
    );
  }

  if (c.status === 'accepted') {
    const counterpart = c.direction === 'sent' ? c.to : c.from;
    const email = counterpart?.email;
    return (
      <div className="inline-flex flex-col items-start md:items-end gap-1">
        <div className="inline-flex items-center gap-2 rounded-md bg-success/25 border border-success/40 px-3 py-2 text-xs font-semibold">
          <CheckCircle2 size={14} /> Connected · {PURPOSE_LABEL[c.purpose]}
        </div>
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-1 text-xs text-white font-medium hover:underline bg-white/15 rounded-md px-2 py-1"
          >
            <Mail size={12} /> {email}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-md bg-white/15 border border-white/20 px-3 py-2 text-xs font-semibold">
      <XCircle size={14} /> Request declined
    </div>
  );
}
