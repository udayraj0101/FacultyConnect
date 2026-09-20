import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ExternalLink,
  CalendarClock,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Flag,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  Award,
  Landmark,
  IndianRupee,
  Bell,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { SkeletonList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import HeroBanner from '../../components/dashboard/HeroBanner';
import SectionCard from '../../components/dashboard/SectionCard';
import ReportModal from '../../components/ReportModal';
import SaveSearchModal from '../../components/discover/SaveSearchModal';
import { listOpportunities, toggleBookmark } from '../../services/opportunity.service';
import { getMe } from '../../services/faculty.service';
import { useToast } from '../../components/ui/Toast';
import {
  INDEXING_META,
  INDEXING_ORDER,
  indexingChipClass,
} from '../../lib/opportunityIndexing';
import {
  AGENCY_META,
  AGENCY_ORDER,
  CAREER_STAGE_META,
  CAREER_STAGE_ORDER,
  AMOUNT_PRESETS,
  formatAmountRange,
} from '../../lib/opportunityGrants';
import { INDIAN_STATES, FEE_PRESETS } from '../../lib/indianStates';

const MODE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
];

const COST_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

const DEADLINE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Next 7 days' },
  { value: '30', label: 'Next 30 days' },
  { value: '90', label: 'Next 90 days' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'domain_match', label: 'Best domain match' },
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'deadline_desc', label: 'Deadline (latest)' },
];

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function IndexingChips({ indexing }) {
  if (!indexing?.length) return null;
  // Preserve the canonical order (scopus first, WoS next, etc.) so cards
  // don't shuffle depending on insertion order.
  const ordered = INDEXING_ORDER.filter(k => indexing.includes(k));
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ordered.map(key => (
        <span
          key={key}
          title={INDEXING_META[key]?.long || key}
          className={`inline-flex items-center gap-1 rounded-full ${indexingChipClass(key)} border px-2 py-0.5 text-[10px] font-semibold`}
        >
          <BadgeCheck size={10} /> {INDEXING_META[key]?.short || key}
        </span>
      ))}
    </div>
  );
}

function TrustMarker({ opp }) {
  if (opp.type !== 'journal') return null;
  // Green shield for platform-vouched "not predatory" journals. When the
  // marker isn't set we render nothing rather than a red "unverified"
  // signal — we don't want to accidentally accuse a legitimate journal
  // just because our screening backlog hasn't reached it yet.
  if (opp.predatoryScreened) {
    return (
      <span
        title="Screened against predatory-venue lists (Beall / Retraction Watch signals). Not a predatory journal."
        className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 px-2 py-0.5 text-[10px] font-semibold"
      >
        <ShieldCheck size={10} /> Not predatory
      </span>
    );
  }
  return null;
}

// Small pill used to surface Wave 3 filter-relevant fields (credit hours,
// certificate, agency, amount). Neutral styling so it doesn't compete
// with the coloured indexing chips on journal cards.
function MetaChip({ icon, label, tone = 'neutral', title }) {
  const toneClass =
    tone === 'success'
      ? 'bg-success/10 text-success border-success/30'
      : 'bg-muted text-text-light border-border';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full ${toneClass} border px-2 py-0.5 text-[10px] font-semibold`}
    >
      {icon}
      {label}
    </span>
  );
}

// Small horizontal row of type-specific meta chips shown under the
// description on a card. Reads type off the opportunity so one function
// serves fdp / conference / grant.
function CardMetaRow({ opp }) {
  if (opp.type === 'fdp' || opp.type === 'conference') {
    const chips = [];
    if (opp.creditHours != null && opp.creditHours > 0) {
      chips.push(
        <MetaChip
          key="credit"
          icon={<Clock size={10} />}
          label={`${opp.creditHours} CPD hours`}
          title="AICTE / CPD credit hours awarded"
        />,
      );
    }
    if (opp.certificateProvided) {
      chips.push(
        <MetaChip
          key="cert"
          icon={<Award size={10} />}
          label="Certificate"
          tone="success"
          title="Certificate of participation provided"
        />,
      );
    }
    return chips.length ? <div className="flex items-center gap-1 flex-wrap">{chips}</div> : null;
  }
  if (opp.type === 'grant') {
    const chips = [];
    if (opp.agency && AGENCY_META[opp.agency]) {
      chips.push(
        <MetaChip
          key="agency"
          icon={<Landmark size={10} />}
          label={AGENCY_META[opp.agency].short}
          title={AGENCY_META[opp.agency].long}
        />,
      );
    }
    const range = formatAmountRange(opp.amountMin, opp.amountMax);
    if (range) {
      chips.push(
        <MetaChip
          key="amount"
          icon={<IndianRupee size={10} />}
          label={range}
          title="Grant amount range"
        />,
      );
    }
    for (const stage of opp.careerStage || []) {
      if (!CAREER_STAGE_META[stage]) continue;
      chips.push(
        <MetaChip
          key={`stage-${stage}`}
          icon={<BadgeCheck size={10} />}
          label={CAREER_STAGE_META[stage].short}
          title={CAREER_STAGE_META[stage].long}
        />,
      );
    }
    return chips.length ? <div className="flex items-center gap-1 flex-wrap">{chips}</div> : null;
  }
  return null;
}

function LegacyFallbackBadge({ opp }) {
  // Non-journal listings still use the legacy single-badge field. Also
  // shows for journals that haven't been enriched with indexing[] yet
  // during the seed → prod migration window.
  if (opp.type === 'journal' && (opp.indexing?.length || opp.predatoryScreened)) return null;
  const badge = opp.verificationBadge;
  if (badge === 'ugc_care_verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 px-2 py-0.5 text-[11px] font-semibold">
        <BadgeCheck size={12} /> UGC-CARE
      </span>
    );
  }
  if (badge === 'scopus_indexed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 text-[11px] font-semibold">
        <BadgeCheck size={12} /> Scopus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-text-muted border border-border px-2 py-0.5 text-[11px] font-semibold">
      <ShieldAlert size={12} /> Unverified
    </span>
  );
}

function OpportunityCard({ opp, typeConfig, bookmarked, onToggleBookmark, onReport, index }) {
  const days = daysUntil(opp.deadline);
  const deadlineColor =
    days <= 7 ? 'text-danger' : days <= 30 ? 'text-secondary' : 'text-text-muted';
  const detailUrl = `/discover/${typeConfig.slug}/${opp.id}`;

  // Any button/link inside the card should not bubble up and trigger the
  // outer "open detail" navigation.
  const stop = e => e.stopPropagation();

  return (
    <motion.article
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      className="relative rounded-xl bg-white border border-border hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col"
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: typeConfig.color }} />
      <Link
        to={detailUrl}
        className="pl-5 pr-5 py-5 flex flex-col gap-3 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <IndexingChips indexing={opp.indexing} />
            <TrustMarker opp={opp} />
            <LegacyFallbackBadge opp={opp} />
          </div>
          <div className="flex items-center gap-1" onClick={stop}>
            <button
              onClick={e => {
                e.preventDefault();
                onReport(opp);
              }}
              aria-label="Report this opportunity"
              title="Report"
              className="p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/5 transition-colors"
            >
              <Flag size={16} />
            </button>
            <button
              onClick={e => {
                e.preventDefault();
                onToggleBookmark(opp.id);
              }}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark opportunity'}
              className={`p-1 rounded-md transition-colors ${
                bookmarked
                  ? 'text-primary'
                  : 'text-text-muted hover:text-primary hover:bg-muted'
              }`}
            >
              {bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-text-light leading-snug line-clamp-2 group-hover:text-primary">
            {opp.title}
          </h3>
          <div className="text-xs text-text-muted mt-0.5">{opp.organizerName}</div>
          {opp.type === 'journal' && opp.lastVerifiedAgainstUgcCareOn && (
            <div className="text-[10px] text-text-muted mt-1 inline-flex items-center gap-1">
              <BadgeCheck size={10} className="text-success" />
              UGC-CARE last verified{' '}
              {new Date(opp.lastVerifiedAgainstUgcCareOn).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          )}
        </div>

        <p className="text-sm text-text-muted line-clamp-3 leading-relaxed flex-1">
          {opp.description}
        </p>

        {opp.matchedTags?.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <Sparkles size={11} className="text-primary shrink-0" />
            <span className="font-semibold text-primary">Matched your domains:</span>
            <span className="truncate">
              {opp.matchedTags.slice(0, 4).join(', ')}
              {opp.matchedTags.length > 4 ? ` +${opp.matchedTags.length - 4}` : ''}
            </span>
          </div>
        )}

        <CardMetaRow opp={opp} />

        <div className="flex items-center justify-between mt-1 gap-4 flex-wrap">
          <div className="text-xs text-text-muted flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="capitalize">{opp.mode}</span>
              {opp.city || opp.state
                ? ` · ${[opp.city, opp.state].filter(Boolean).join(', ')}`
                : opp.location
                  ? ` · ${opp.location}`
                  : ''}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                opp.cost === 0 ? 'bg-success/10 text-success' : 'bg-muted text-text-muted'
              }`}
            >
              {opp.cost === 0 ? 'Free' : `Rs. ${opp.cost.toLocaleString('en-IN')}`}
            </span>
          </div>
          <div className={`inline-flex items-center gap-1 text-xs font-semibold ${deadlineColor}`}>
            <CalendarClock size={12} />
            {new Date(opp.deadline).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            · {days > 0 ? `${days}d left` : 'closed'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
            View details →
          </span>
          {opp.url && (
            <a
              href={opp.url}
              target="_blank"
              rel="noreferrer"
              onClick={stop}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary hover:underline"
            >
              Organizer page <ExternalLink size={11} />
            </a>
          )}
        </div>
      </Link>
    </motion.article>
  );
}

/**
 * Reusable shell for the four type-specific Discover pages. Locks type to
 * one value, offers the shared filters (search, mode, cost, deadline
 * range, domain) plus an optional `extraFilters` slot for future
 * type-specific filters once the Opportunity model grows.
 */
export default function DiscoverShell({ typeConfig, extraFilters }) {
  const [filters, setFilters] = useState({
    mode: '',
    cost: '',
    q: '',
    domain: '',
    deadlineWithin: '',
    sort: 'newest',
    indexing: [],
    creditHoursMin: '',
    certificate: '',
    agency: [],
    amountMax: '',
    careerStage: [],
    state: '',
    city: '',
    costMax: '',
  });
  const [pendingQuery, setPendingQuery] = useState('');
  const [pendingDomain, setPendingDomain] = useState('');
  const [data, setData] = useState({ opportunities: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [savingBookmarks, setSavingBookmarks] = useState(new Set());
  const [reportTarget, setReportTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const { toast } = useToast();

  // Reset filters when the user switches pages (typeConfig changes)
  useEffect(() => {
    setFilters({
      mode: '',
      cost: '',
      q: '',
      domain: '',
      deadlineWithin: '',
      sort: 'newest',
      indexing: [],
      creditHoursMin: '',
      certificate: '',
      agency: [],
      amountMax: '',
      careerStage: [],
      state: '',
      city: '',
      costMax: '',
    });
    setPendingQuery('');
    setPendingDomain('');
  }, [typeConfig.type]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setBookmarkedIds(new Set(me.bookmarkedOpportunityIds || []));
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
    const isFdpOrConf = typeConfig.type === 'fdp' || typeConfig.type === 'conference';
    const isGrant = typeConfig.type === 'grant';
    const query = {
      type: [typeConfig.type],
      mode: filters.mode,
      cost: filters.cost,
      q: filters.q,
      domain: filters.domain ? [filters.domain] : [],
      sort: filters.sort,
      indexing: typeConfig.type === 'journal' ? filters.indexing : [],
      credit_hours_min: isFdpOrConf && filters.creditHoursMin ? filters.creditHoursMin : undefined,
      certificate: isFdpOrConf && filters.certificate ? filters.certificate : undefined,
      agency: isGrant ? filters.agency : [],
      amount_max: isGrant && filters.amountMax ? filters.amountMax : undefined,
      career_stage: isGrant ? filters.careerStage : [],
      state: isFdpOrConf && filters.state ? filters.state : undefined,
      city: isFdpOrConf && filters.city ? filters.city : undefined,
      cost_max: isFdpOrConf && filters.costMax !== '' ? filters.costMax : undefined,
    };
    if (filters.deadlineWithin) {
      const days = Number(filters.deadlineWithin);
      const end = new Date();
      end.setDate(end.getDate() + days);
      query.deadline_before = end.toISOString();
    }
    listOpportunities(query)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled)
          setError(err.response?.data?.error?.message || 'Failed to load opportunities');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, typeConfig.type]);

  const onToggleBookmark = async id => {
    if (savingBookmarks.has(id)) return;
    setSavingBookmarks(prev => new Set(prev).add(id));
    try {
      const result = await toggleBookmark(id);
      setBookmarkedIds(new Set(result.bookmarkedOpportunityIds));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update bookmark');
    } finally {
      setSavingBookmarks(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const applyKeyword = e => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, q: pendingQuery.trim() }));
  };
  const applyDomain = e => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, domain: pendingDomain.trim() }));
  };

  const clearFilters = () => {
    setFilters({
      mode: '',
      cost: '',
      q: '',
      domain: '',
      deadlineWithin: '',
      sort: 'newest',
      indexing: [],
      creditHoursMin: '',
      certificate: '',
      agency: [],
      amountMax: '',
      careerStage: [],
      state: '',
      city: '',
      costMax: '',
    });
    setPendingQuery('');
    setPendingDomain('');
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.mode) n += 1;
    if (filters.cost) n += 1;
    if (filters.q) n += 1;
    if (filters.domain) n += 1;
    if (filters.deadlineWithin) n += 1;
    if (filters.indexing?.length) n += filters.indexing.length;
    if (filters.creditHoursMin) n += 1;
    if (filters.certificate) n += 1;
    if (filters.agency?.length) n += filters.agency.length;
    if (filters.amountMax) n += 1;
    if (filters.careerStage?.length) n += filters.careerStage.length;
    if (filters.state) n += 1;
    if (filters.city) n += 1;
    if (filters.costMax !== '') n += 1;
    return n;
  }, [filters]);

  const toggleIndexing = key => {
    setFilters(prev => {
      const current = prev.indexing || [];
      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, indexing: next };
    });
  };

  const toggleArrayFilter = (field, key) => {
    setFilters(prev => {
      const current = prev[field] || [];
      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, [field]: next };
    });
  };

  // Auto-composed name for the save-search modal. Cheap summary of the
  // active filters so the common path is one click. The user can edit
  // before saving.
  const savedSearchName = useMemo(() => {
    const bits = [typeConfig.label];
    if (filters.domain) bits.push(filters.domain);
    if (filters.indexing?.length) bits.push(filters.indexing.slice(0, 2).join('+'));
    if (filters.agency?.length) bits.push(filters.agency[0].toUpperCase());
    if (filters.careerStage?.length) {
      bits.push(filters.careerStage[0].replace('_', '-'));
    }
    if (filters.creditHoursMin) bits.push(`${filters.creditHoursMin}+ CPD`);
    if (filters.certificate === 'true') bits.push('cert');
    if (filters.mode) bits.push(filters.mode);
    if (filters.cost === 'free') bits.push('free');
    if (filters.q) bits.push(`"${filters.q}"`);
    return bits.slice(0, 5).join(' · ').slice(0, 100);
  }, [filters, typeConfig]);

  // Persisted payload for the saved-search backend. type/page/limit are
  // re-attached by the backend when the search runs, so we strip them.
  const savedSearchFilters = useMemo(() => {
    const out = {};
    if (filters.mode) out.mode = filters.mode;
    if (filters.cost) out.cost = filters.cost;
    if (filters.q) out.q = filters.q;
    if (filters.domain) out.domain = [filters.domain];
    if (filters.sort && filters.sort !== 'newest') out.sort = filters.sort;
    if (filters.indexing?.length) out.indexing = filters.indexing;
    if (filters.creditHoursMin) out.credit_hours_min = filters.creditHoursMin;
    if (filters.certificate) out.certificate = filters.certificate;
    if (filters.agency?.length) out.agency = filters.agency;
    if (filters.amountMax) out.amount_max = filters.amountMax;
    if (filters.careerStage?.length) out.career_stage = filters.careerStage;
    if (filters.deadlineWithin) {
      const days = Number(filters.deadlineWithin);
      const end = new Date();
      end.setDate(end.getDate() + days);
      out.deadline_before = end.toISOString();
    }
    return out;
  }, [filters]);

  const onSaved = saved => {
    toast({
      title: 'Search saved',
      description: saved.alertsEnabled
        ? "You'll be alerted when new matches are posted."
        : 'Alerts are off — you can enable them later from Saved searches.',
      variant: 'success',
    });
  };

  const heroStats = useMemo(() => {
    const verified = data.opportunities.filter(
      o => o.verificationBadge === 'ugc_care_verified' || o.verificationBadge === 'scopus_indexed',
    ).length;
    const bookmarks = bookmarkedIds.size;
    return [
      { icon: <Sparkles size={18} />, value: data.total, label: `Live ${typeConfig.label.toLowerCase()}` },
      { icon: <BadgeCheck size={18} />, value: verified, label: 'Verified in view' },
      { icon: <BookmarkCheck size={18} />, value: bookmarks, label: 'Your bookmarks' },
    ];
  }, [data, bookmarkedIds, typeConfig]);

  const TypeIcon = typeConfig.Icon;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title={typeConfig.heroTitle}
        subtitle={typeConfig.heroSubtitle}
        icon={<TypeIcon strokeWidth={1.4} />}
        stats={heroStats}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter toolbar — always visible so users can toggle the rail */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-border px-4 py-2 text-sm font-semibold text-text-light hover:border-primary/40 hover:text-primary transition-colors"
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span
              className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: typeConfig.color }}
            >
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={13}
            className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setSaveSearchOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            title="Save this filter combo and get alerts for new matches"
          >
            <Bell size={12} />
            Save this search
          </button>
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
          <div className="text-sm text-text-muted">
            {!loading && (
              <>
                Showing <span className="font-semibold text-text-light">{data.total}</span>{' '}
                {data.total === 1 ? typeConfig.singular.toLowerCase() : typeConfig.label.toLowerCase()}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="ml-3 text-primary font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`grid gap-4 sm:gap-6 ${
          filtersOpen ? 'grid-cols-1 lg:grid-cols-[280px_1fr]' : 'grid-cols-1'
        }`}
      >
        {filtersOpen && (
          <SectionCard title="Filters" subtitle="Narrow the results">
            <div className="space-y-6">
              <form onSubmit={applyKeyword}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  Search
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Keyword"
                    value={pendingQuery}
                    onChange={e => setPendingQuery(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Go
                  </Button>
                </div>
              </form>

              <form onSubmit={applyDomain}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  Domain
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Machine Learning"
                    value={pendingDomain}
                    onChange={e => setPendingDomain(e.target.value)}
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Go
                  </Button>
                </div>
              </form>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  Deadline
                </div>
                <div className="space-y-1">
                  {DEADLINE_OPTIONS.map(opt => (
                    <label
                      key={opt.value || 'any-deadline'}
                      className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                    >
                      <input
                        type="radio"
                        name="deadline"
                        checked={filters.deadlineWithin === opt.value}
                        onChange={() =>
                          setFilters(prev => ({ ...prev, deadlineWithin: opt.value }))
                        }
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  Mode
                </div>
                <div className="space-y-1">
                  {MODE_OPTIONS.map(opt => (
                    <label
                      key={opt.value || 'any-mode'}
                      className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                    >
                      <input
                        type="radio"
                        name="mode"
                        checked={filters.mode === opt.value}
                        onChange={() => setFilters(prev => ({ ...prev, mode: opt.value }))}
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                  Cost
                </div>
                <div className="space-y-1">
                  {COST_OPTIONS.map(opt => (
                    <label
                      key={opt.value || 'any-cost'}
                      className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                    >
                      <input
                        type="radio"
                        name="cost"
                        checked={filters.cost === opt.value}
                        onChange={() => setFilters(prev => ({ ...prev, cost: opt.value }))}
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {typeConfig.type === 'journal' && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                    Indexing
                  </div>
                  <div className="space-y-1">
                    {INDEXING_ORDER.map(key => {
                      const checked = filters.indexing.includes(key);
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                          title={INDEXING_META[key].long}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleIndexing(key)}
                            className="accent-primary"
                          />
                          {INDEXING_META[key].long}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {(typeConfig.type === 'fdp' || typeConfig.type === 'conference') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      State
                    </label>
                    <select
                      value={filters.state}
                      onChange={e =>
                        setFilters(prev => ({ ...prev, state: e.target.value }))
                      }
                      className="w-full h-10 rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Any state</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-text-muted mt-1">
                      Only listings with a structured location (offline / hybrid) match.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      City
                    </label>
                    <Input
                      placeholder="e.g. Bengaluru"
                      value={filters.city}
                      onChange={e =>
                        setFilters(prev => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      Maximum registration fee
                    </label>
                    <select
                      value={filters.costMax}
                      onChange={e =>
                        setFilters(prev => ({ ...prev, costMax: e.target.value }))
                      }
                      className="w-full h-10 rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {FEE_PRESETS.map(o => (
                        <option key={o.value || 'any-fee'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      Minimum credit hours
                    </label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        max="500"
                        placeholder="e.g. 20"
                        value={filters.creditHoursMin}
                        onChange={e =>
                          setFilters(prev => ({ ...prev, creditHoursMin: e.target.value }))
                        }
                      />
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">
                      AICTE / CPD hours the listing must offer.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      Certificate
                    </div>
                    <div className="space-y-1">
                      {[
                        { value: '', label: 'Any' },
                        { value: 'true', label: 'Certificate provided' },
                      ].map(opt => (
                        <label
                          key={opt.value || 'any-cert'}
                          className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                        >
                          <input
                            type="radio"
                            name="certificate"
                            checked={filters.certificate === opt.value}
                            onChange={() =>
                              setFilters(prev => ({ ...prev, certificate: opt.value }))
                            }
                            className="accent-primary"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {typeConfig.type === 'grant' && (
                <>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      Agency
                    </div>
                    <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                      {AGENCY_ORDER.map(key => {
                        const checked = filters.agency.includes(key);
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                            title={AGENCY_META[key].long}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleArrayFilter('agency', key)}
                              className="accent-primary"
                            />
                            {AGENCY_META[key].long}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      Amount range
                    </label>
                    <select
                      value={filters.amountMax}
                      onChange={e =>
                        setFilters(prev => ({ ...prev, amountMax: e.target.value }))
                      }
                      className="w-full h-10 rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {AMOUNT_PRESETS.map(o => (
                        <option key={o.value || 'any-amount'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-text-muted mt-1">
                      Grants whose upper-bound is at most this value.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                      Career stage
                    </div>
                    <div className="space-y-1">
                      {CAREER_STAGE_ORDER.map(key => {
                        const checked = filters.careerStage.includes(key);
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                            title={CAREER_STAGE_META[key].long}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleArrayFilter('careerStage', key)}
                              className="accent-primary"
                            />
                            {CAREER_STAGE_META[key].long}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {extraFilters && <div>{extraFilters}</div>}

              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
                  Clear filters ({activeFilterCount})
                </Button>
              )}
            </div>
          </SectionCard>
        )}

        <section>
          {loading && <SkeletonList count={4} cardLines={4} />}

          {!loading && data.opportunities.length === 0 && (
            <EmptyState
              icon={<Search size={20} />}
              title={typeConfig.emptyTitle}
              description={typeConfig.emptyDescription}
              action={
                activeFilterCount > 0 ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          )}

          <div
            className={`grid gap-4 ${
              filtersOpen ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {data.opportunities.map((opp, i) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                typeConfig={typeConfig}
                index={i}
                bookmarked={bookmarkedIds.has(opp.id)}
                onToggleBookmark={onToggleBookmark}
                onReport={setReportTarget}
              />
            ))}
          </div>
        </section>
      </div>

      {reportTarget && (
        <ReportModal
          targetType="opportunity"
          targetId={reportTarget.id}
          targetLabel={`${reportTarget.title} · ${reportTarget.organizerName || ''}`}
          onClose={() => setReportTarget(null)}
          onSubmitted={() => setReportTarget(null)}
        />
      )}

      <SaveSearchModal
        open={saveSearchOpen}
        defaultName={savedSearchName}
        type={typeConfig.type}
        typeLabel={typeConfig.label}
        filters={savedSearchFilters}
        onClose={() => setSaveSearchOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}
