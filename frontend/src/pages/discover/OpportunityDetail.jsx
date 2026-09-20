import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  CalendarClock,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Flag,
  MapPin,
  Wifi,
  IndianRupee,
  Building2,
  Hash,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Landmark,
  Users,
  Handshake,
  CalendarDays,
  Download,
} from 'lucide-react';
import {
  INDEXING_META,
  INDEXING_ORDER,
  indexingChipClass,
  OA_TYPE_LABEL,
} from '../../lib/opportunityIndexing';
import {
  AGENCY_META,
  CAREER_STAGE_META,
  formatAmountRange,
} from '../../lib/opportunityGrants';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { buttonVariants } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import HeroBanner from '../../components/dashboard/HeroBanner';
import ReportModal from '../../components/ReportModal';
import { getOpportunity, toggleBookmark } from '../../services/opportunity.service';
import { getMe } from '../../services/faculty.service';
import { SLUG_META, TYPE_META } from '../../lib/opportunityTypes';

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function VerificationBadge({ badge, size = 'md' }) {
  const px = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-[11px]';
  const iconSize = size === 'lg' ? 14 : 12;
  if (badge === 'ugc_care_verified') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 ${px} font-semibold`}>
        <BadgeCheck size={iconSize} /> UGC-CARE verified
      </span>
    );
  }
  if (badge === 'scopus_indexed') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 ${px} font-semibold`}>
        <BadgeCheck size={iconSize} /> Scopus indexed
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-muted text-text-muted border border-border ${px} font-semibold`}>
      <ShieldAlert size={iconSize} /> Unverified
    </span>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-text-muted shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
          {label}
        </div>
        <div className="text-sm text-text-light mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

export default function OpportunityDetail() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const typeConfig = SLUG_META[slug];

  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([getOpportunity(id), getMe().catch(() => null)])
      .then(([oppData, me]) => {
        if (cancelled) return;
        setOpp(oppData);
        if (me?.bookmarkedOpportunityIds?.includes(id)) setBookmarked(true);
      })
      .catch(err => {
        if (!cancelled)
          setError(err.response?.data?.error?.message || 'Could not load this opportunity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // If the slug doesn't match the returned type, redirect to the correct URL
  // so shared/bookmarked links normalize (e.g., /discover/fdps/abc for a grant
  // → /discover/grants/abc).
  useEffect(() => {
    if (!opp || !typeConfig) return;
    if (opp.type !== typeConfig.type) {
      const correct = TYPE_META[opp.type];
      if (correct) navigate(`/discover/${correct.slug}/${id}`, { replace: true });
    }
  }, [opp, typeConfig, id, navigate]);

  if (!typeConfig) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>Unknown opportunity type: {slug}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const TypeIcon = typeConfig.Icon;

  const onToggleBookmark = async () => {
    if (savingBookmark) return;
    setSavingBookmark(true);
    try {
      const result = await toggleBookmark(id);
      setBookmarked(result.bookmarked);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update bookmark');
    } finally {
      setSavingBookmark(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (error || !opp) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <Link
          to={`/discover/${typeConfig.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary"
        >
          <ArrowLeft size={14} /> Back to {typeConfig.label}
        </Link>
        <Alert variant="destructive">
          <AlertDescription>{error || 'This opportunity could not be found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const days = daysUntil(opp.deadline);
  const deadlineColor =
    days <= 7 ? 'text-danger' : days <= 30 ? 'text-secondary' : 'text-text-muted';
  const deadlineLabel = days > 0 ? `${days} day${days === 1 ? '' : 's'} left` : 'Closed';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to={`/discover/${typeConfig.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-primary font-medium"
        >
          <ArrowLeft size={14} /> Back to {typeConfig.label}
        </Link>
        <div className="flex items-center gap-2">
          {(opp.startDate || opp.deadline) && (
            <a
              href={`/v1/opportunities/${opp.id}/ical`}
              // download attr hints the browser to save rather than
              // navigate. The backend's Content-Disposition header sets
              // a friendly filename regardless.
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-light hover:text-primary hover:border-primary/40"
              title="Download .ics — imports into Google / Outlook / Apple Calendar"
            >
              <CalendarDays size={13} /> Add to calendar
            </a>
          )}
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-danger hover:border-danger/30"
          >
            <Flag size={13} /> Report
          </button>
          <button
            onClick={onToggleBookmark}
            disabled={savingBookmark}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
              bookmarked
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-light border-border hover:border-primary/40 hover:text-primary'
            }`}
          >
            {bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
        </div>
      </div>

      <HeroBanner
        title={opp.title}
        subtitle={
          <>
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-white/15 border border-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider align-middle mr-2"
            >
              <TypeIcon size={12} /> {typeConfig.singular}
            </span>
            <span>{opp.organizerName}</span>
          </>
        }
        icon={<TypeIcon strokeWidth={1.4} />}
      />

      {/* Verification + deadline strip */}
      <motion.div
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-border bg-white p-4"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {opp.type === 'journal' && opp.indexing?.length > 0 ? (
            <>
              {INDEXING_ORDER.filter(k => opp.indexing.includes(k)).map(key => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-full ${indexingChipClass(key)} border px-3 py-1 text-xs font-semibold`}
                  title={INDEXING_META[key].long}
                >
                  <BadgeCheck size={12} /> {INDEXING_META[key].long}
                </span>
              ))}
              {opp.predatoryScreened && (
                <span
                  title="Screened against predatory-venue lists. Not a predatory journal."
                  className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 px-3 py-1 text-xs font-semibold"
                >
                  <ShieldCheck size={12} /> Not predatory
                </span>
              )}
            </>
          ) : (
            <VerificationBadge badge={opp.verificationBadge} size="lg" />
          )}
        </div>
        <div className={`inline-flex items-center gap-1.5 text-sm font-bold ${deadlineColor}`}>
          <CalendarClock size={15} />
          {formatDate(opp.deadline)} · {deadlineLabel}
        </div>
      </motion.div>

      {/* Description */}
      <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
          About this {typeConfig.singular.toLowerCase()}
        </h2>
        <p className="text-sm sm:text-base text-text-light leading-relaxed whitespace-pre-line">
          {opp.description}
        </p>
      </section>

      {/* Metadata */}
      <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
          Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 divide-y sm:divide-y-0 divide-border">
          <InfoRow
            icon={<Building2 size={15} />}
            label="Organizer"
            value={opp.organizerName}
          />
          <InfoRow
            icon={<Wifi size={15} />}
            label="Mode"
            value={<span className="capitalize">{opp.mode}</span>}
          />
          {(opp.city || opp.state || opp.location) && (
            <InfoRow
              icon={<MapPin size={15} />}
              label="Location"
              value={
                opp.city || opp.state
                  ? [opp.city, opp.state, opp.location && opp.location !== opp.city ? opp.location : null]
                      .filter(Boolean)
                      .join(', ')
                  : opp.location
              }
            />
          )}
          {opp.type !== 'journal' && opp.type !== 'grant' && (
            <InfoRow
              icon={<IndianRupee size={15} />}
              label="Cost"
              value={opp.cost === 0 ? 'Free' : `Rs. ${opp.cost.toLocaleString('en-IN')}`}
            />
          )}
          <InfoRow
            icon={<CalendarClock size={15} />}
            label="Deadline"
            value={`${formatDate(opp.deadline)} · ${deadlineLabel}`}
          />
          {opp.startDate && (
            <InfoRow
              icon={<CalendarDays size={15} />}
              label="Event dates"
              value={
                opp.endDate && opp.endDate !== opp.startDate
                  ? `${formatDate(opp.startDate)} – ${formatDate(opp.endDate)}`
                  : formatDate(opp.startDate)
              }
            />
          )}
          {opp.issn && (
            <InfoRow icon={<Hash size={15} />} label="ISSN" value={opp.issn} />
          )}
          {(opp.type === 'fdp' || opp.type === 'conference') &&
            opp.creditHours != null &&
            opp.creditHours > 0 && (
              <InfoRow
                icon={<Clock size={15} />}
                label="Credit hours"
                value={`${opp.creditHours} AICTE / CPD hours`}
              />
            )}
          {(opp.type === 'fdp' || opp.type === 'conference') && (
            <InfoRow
              icon={<Award size={15} />}
              label="Certificate"
              value={opp.certificateProvided ? 'Provided on completion' : 'Not provided'}
            />
          )}
          {opp.type === 'grant' && opp.agency && AGENCY_META[opp.agency] && (
            <InfoRow
              icon={<Landmark size={15} />}
              label="Funding agency"
              value={AGENCY_META[opp.agency].long}
            />
          )}
          {opp.type === 'grant' && formatAmountRange(opp.amountMin, opp.amountMax) && (
            <InfoRow
              icon={<IndianRupee size={15} />}
              label="Grant amount"
              value={formatAmountRange(opp.amountMin, opp.amountMax)}
            />
          )}
          {opp.type === 'grant' && opp.careerStage?.length > 0 && (
            <InfoRow
              icon={<Users size={15} />}
              label="Career stage"
              value={opp.careerStage
                .map(s => CAREER_STAGE_META[s]?.long || s)
                .join(', ')}
            />
          )}
          {opp.type === 'grant' && opp.eligibleRoles?.length > 0 && (
            <InfoRow
              icon={<BadgeCheck size={15} />}
              label="Apply as"
              value={opp.eligibleRoles
                .map(r => (r === 'pi' ? 'PI' : r === 'co_pi' ? 'Co-PI' : 'Investigator'))
                .join(' / ')}
            />
          )}
        </div>
      </section>

      {/* Journal APC / OA — surfaced separately from event "cost" because
          the semantics are totally different: APC is what the author pays
          the publisher to publish, not a registration fee. */}
      {opp.type === 'journal' && opp.apc && (
        <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 inline-flex items-center gap-2">
            <BookOpen size={13} /> Publishing model
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 divide-y sm:divide-y-0 divide-border">
            <InfoRow
              icon={<Sparkles size={15} />}
              label="Open access"
              value={OA_TYPE_LABEL[opp.apc.oaType || 'none']}
            />
            <InfoRow
              icon={<IndianRupee size={15} />}
              label="Article Processing Charge (APC)"
              value={
                opp.apc.amount == null || opp.apc.amount === 0
                  ? 'None'
                  : `${opp.apc.currency || 'INR'} ${Number(opp.apc.amount).toLocaleString('en-IN')}`
              }
            />
            {opp.apc.waiverAvailable && (
              <InfoRow
                icon={<BadgeCheck size={15} />}
                label="Waiver"
                value="Author-side waiver may be available on request"
              />
            )}
          </div>
        </section>
      )}

      {/* UGC-CARE verification note */}
      {opp.verificationBadge === 'ugc_care_verified' && opp.lastVerifiedAgainstUgcCareOn && (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="w-9 h-9 rounded-md bg-success/15 text-success flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="text-sm text-text-light">
            <div className="font-bold text-success">Verified against UGC-CARE</div>
            <div className="text-xs text-text-muted mt-0.5">
              This listing was last cross-checked against the UGC-CARE list on{' '}
              <span className="font-semibold text-text-light">
                {formatDate(opp.lastVerifiedAgainstUgcCareOn)}
              </span>
              . Re-verification runs nightly.
            </div>
          </div>
        </div>
      )}

      {/* Co-PI finder — grants only. Deep-links to Directory pre-filtered
          by the grant's first domain tag + open_to=co_pi + excludes the
          viewer's own institution (different-institution collaborators
          are the whole point of a Co-PI hunt). */}
      {opp.type === 'grant' && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Handshake size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-secondary">Need a co-applicant?</div>
              <p className="text-xs text-text-muted mt-0.5 max-w-xl leading-relaxed">
                Open the Directory pre-filtered by this grant's domain and by faculty who
                declared they're open to Co-PI invitations. Same-institution peers are
                hidden by default.
              </p>
            </div>
          </div>
          <Link
            to={{
              pathname: '/directory',
              search: `?open_to=co_pi&exclude_same_institution=true${
                opp.domainTags?.[0]
                  ? `&domain=${encodeURIComponent(opp.domainTags[0])}`
                  : ''
              }`,
            }}
            className={buttonVariants({ size: 'sm' })}
          >
            <Handshake size={13} className="mr-1.5" /> Find a Co-PI
          </Link>
        </div>
      )}

      {/* CTA */}
      {opp.url && (
        <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-5 sm:p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-bold text-secondary">Ready to apply?</div>
            <p className="text-xs text-text-muted mt-0.5">
              Registration and submissions happen on the organizer's own portal.
            </p>
          </div>
          <a
            href={opp.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: 'lg' })}
          >
            Visit organizer page <ExternalLink size={14} className="ml-2" />
          </a>
        </div>
      )}

      {reportOpen && (
        <ReportModal
          targetType="opportunity"
          targetId={opp.id}
          targetLabel={`${opp.title} · ${opp.organizerName || ''}`}
          onClose={() => setReportOpen(false)}
          onSubmitted={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
