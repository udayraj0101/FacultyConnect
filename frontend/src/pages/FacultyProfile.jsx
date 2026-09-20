import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, Link as LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import HeroBanner from '../components/dashboard/HeroBanner';
import MetricsStrip from '../components/profile/MetricsStrip';
import BasicInfoCard from '../components/profile/BasicInfoCard';
import BioCard from '../components/profile/BioCard';
import EmploymentHistoryCard from '../components/profile/EmploymentHistoryCard';
import EducationCard from '../components/profile/EducationCard';
import AwardsCard from '../components/profile/AwardsCard';
import GrantsCard from '../components/profile/GrantsCard';
import ExternalLinksCard from '../components/profile/ExternalLinksCard';
import DomainTagsCard from '../components/profile/DomainTagsCard';
import ScopusEnrichmentCard from '../components/profile/ScopusEnrichmentCard';
import VidwanCard from '../components/profile/VidwanCard';
import CasScoreCard from '../components/profile/CasScoreCard';
import PublicationsCard from '../components/profile/PublicationsCard';
import DirectoryVisibilityCard from '../components/profile/DirectoryVisibilityCard';
import PublicProfileCard from '../components/profile/PublicProfileCard';
import OpenToCard from '../components/profile/OpenToCard';
import { useProfile } from '../hooks/useProfile';
import { usePublications } from '../hooks/usePublications';

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .join('')
    .toUpperCase();
}

function ProfileActions({ faculty, onConnectOrcid, onExportCv }) {
  const [connecting, setConnecting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const orcidLinked = Boolean(faculty.orcidId);

  const connect = async () => {
    if (orcidLinked || connecting) return;
    setConnecting(true);
    try {
      await onConnectOrcid();
    } catch {
      setConnecting(false);
    }
  };
  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await onExportCv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={connect}
        disabled={orcidLinked || connecting}
        className="bg-white hover:bg-white/95 border-transparent text-primary font-semibold min-w-[180px] justify-center"
      >
        <LinkIcon size={14} className="mr-2" />
        {orcidLinked ? 'ORCID Connected' : connecting ? 'Redirecting…' : 'Connect ORCID'}
      </Button>
      <Button
        variant="outline"
        onClick={doExport}
        disabled={exporting}
        className="bg-transparent border-white/40 hover:bg-white/10 text-white min-w-[180px] justify-center"
      >
        <Download size={14} className="mr-2" />
        {exporting ? 'Generating…' : 'Download CV (PDF)'}
      </Button>
      {orcidLinked && (
        <div className="text-[11px] opacity-80 text-right hidden sm:block md:text-right">
          ORCID iD {faculty.orcidId}
        </div>
      )}
    </>
  );
}

/**
 * Small in-page nav that jump-scrolls to each section. Purely visual —
 * doesn't touch state or the router.
 */
function SectionNav() {
  const sections = [
    { id: 'about', label: 'About' },
    { id: 'career', label: 'Career' },
    { id: 'research', label: 'Research' },
    { id: 'publications', label: 'Publications' },
    { id: 'cas', label: 'CAS score' },
    { id: 'network', label: 'Directory' },
  ];
  return (
    <nav className="sticky top-16 z-20 bg-bg-dark/95 backdrop-blur border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-2">
      <ul className="flex gap-1 overflow-x-auto no-scrollbar">
        {sections.map(s => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-text-muted hover:text-primary hover:bg-primary/5"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SectionHeading({ label, hint }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pt-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">{label}</h2>
      {hint && <span className="text-[11px] text-text-muted italic">{hint}</span>}
    </div>
  );
}

export default function FacultyProfile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orcidBanner, setOrcidBanner] = useState(null);

  const profile = useProfile();
  const publications = usePublications({ onFacultyMetricsChange: profile.refetch });

  useEffect(() => {
    const linked = searchParams.get('orcidLinked');
    const orcidErr = searchParams.get('orcidError');
    const orcidMsg = searchParams.get('orcidMessage');
    if (linked === 'true') {
      const orcidId = searchParams.get('orcidId');
      setOrcidBanner({ variant: 'success', message: `ORCID ${orcidId} connected successfully.` });
      searchParams.delete('orcidLinked');
      searchParams.delete('orcidId');
      setSearchParams(searchParams, { replace: true });
    } else if (orcidErr) {
      setOrcidBanner({
        variant: 'destructive',
        message: orcidMsg || `Could not connect ORCID (${orcidErr}).`,
      });
      searchParams.delete('orcidError');
      searchParams.delete('orcidMessage');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (profile.loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <SkeletonCard lines={3} />
        <div>
          <Skeleton className="h-3 w-32 mb-3" />
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} className="flex-1 min-w-[140px] h-24" />
            ))}
          </div>
        </div>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (profile.error && !profile.faculty) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertDescription>{profile.error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!profile.faculty) return null;

  const { faculty, setError } = profile;
  const designationLabel =
    faculty.designation === 'Professor' ? 'Professor' : `${faculty.designation} Professor`;
  const institutionVerified = faculty.institution?.verificationStatus === 'verified';

  const subtitle = (
    <>
      <span>{designationLabel}</span>
      {faculty.department && (
        <>
          <span className="mx-2 opacity-60">·</span>
          <span>{faculty.department}</span>
        </>
      )}
      {faculty.institution?.name && (
        <>
          <span className="mx-2 opacity-60">·</span>
          <span>{faculty.institution.name}</span>
          {institutionVerified && (
            <span className="ml-2 inline-flex items-center gap-1 bg-white/20 border border-white/20 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider align-middle">
              <CheckCircle2 size={11} /> Verified
            </span>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {profile.error && (
        <Alert variant="destructive">
          <AlertDescription>{profile.error}</AlertDescription>
        </Alert>
      )}
      {orcidBanner && (
        <Alert variant={orcidBanner.variant}>
          <AlertDescription>{orcidBanner.message}</AlertDescription>
        </Alert>
      )}

      <HeroBanner
        avatar={initialsOf(faculty.name)}
        title={faculty.name}
        subtitle={subtitle}
        actions={
          <ProfileActions
            faculty={faculty}
            onConnectOrcid={profile.connectOrcid}
            onExportCv={profile.exportCv}
          />
        }
      />

      <SectionNav />

      <MetricsStrip faculty={faculty} publicationsCount={publications.publications.length} />

      {/* ABOUT — bio, basic info, links */}
      <section id="about" className="space-y-4 scroll-mt-28">
        <SectionHeading label="About" hint="Displayed on your directory profile" />
        <BasicInfoCard faculty={faculty} onSave={profile.updateBasicInfo} onError={setError} />
        <BioCard bio={faculty.bio} onSave={profile.updateBio} onError={setError} />
        <ExternalLinksCard
          links={faculty.externalLinks}
          onSave={profile.updateLinks}
          onError={setError}
        />
      </section>

      {/* CAREER — employment, education, awards, grants */}
      <section id="career" className="space-y-4 scroll-mt-28">
        <SectionHeading label="Career" />
        <EmploymentHistoryCard
          items={faculty.employmentHistory}
          onSave={profile.updateEmployment}
          onError={setError}
        />
        <EducationCard
          items={faculty.education}
          onSave={profile.updateEducation}
          onError={setError}
        />
        <AwardsCard items={faculty.awards} onSave={profile.updateAwards} onError={setError} />
        <GrantsCard
          items={faculty.grantsReceived}
          onSave={profile.updateGrants}
          onError={setError}
        />
      </section>

      {/* RESEARCH — tags + Scopus link */}
      <section id="research" className="space-y-4 scroll-mt-28">
        <SectionHeading label="Research" hint="Drives directory search and opportunity matching" />
        <DomainTagsCard
          tags={faculty.domainTags}
          onUpdateTags={profile.updateTags}
          onError={setError}
        />
        <ScopusEnrichmentCard
          initialScopusId={faculty.scopusAuthorId || ''}
          onSync={publications.syncScopus}
          onError={setError}
        />
        <VidwanCard
          vidwanId={faculty.vidwanId || ''}
          onSave={profile.updateVidwan}
          onError={setError}
        />
      </section>

      {/* CAS SCORE — UGC 2018 Research Score calculator */}
      <section id="cas" className="space-y-4 scroll-mt-28">
        <SectionHeading
          label="CAS Research Score"
          hint="UGC 2018 promotion self-estimate"
        />
        <CasScoreCard onError={setError} />
      </section>

      {/* PUBLICATIONS */}
      <section id="publications" className="space-y-4 scroll-mt-28">
        <SectionHeading
          label="Publications"
          hint={`${publications.publications.length} on file`}
        />
        <PublicationsCard
          publications={publications.publications}
          orcidLinked={Boolean(faculty.orcidId)}
          orcidId={faculty.orcidId}
          onSyncOrcid={publications.syncOrcid}
          onEnrichCrossref={publications.enrichCrossref}
          onImportCsv={publications.importScholarCsv}
          onAddManual={publications.addManual}
          onRemove={publications.remove}
          onError={setError}
        />
      </section>

      {/* DIRECTORY & PUBLIC PROFILE */}
      <section id="network" className="space-y-4 scroll-mt-28">
        <SectionHeading label="Visibility & privacy" />
        <DirectoryVisibilityCard
          directoryVisible={faculty.directoryVisible}
          onToggle={profile.toggleVisibility}
          onError={setError}
        />
        <OpenToCard
          openTo={faculty.openTo}
          onSave={profile.updateOpenTo}
          onError={setError}
        />
        <PublicProfileCard
          faculty={faculty}
          onToggle={profile.togglePublicProfile}
          onError={setError}
        />
      </section>
    </div>
  );
}
