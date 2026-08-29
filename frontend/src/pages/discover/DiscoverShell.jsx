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
  ShieldAlert,
  Flag,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { SkeletonList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import HeroBanner from '../../components/dashboard/HeroBanner';
import SectionCard from '../../components/dashboard/SectionCard';
import ReportModal from '../../components/ReportModal';
import { listOpportunities, toggleBookmark } from '../../services/opportunity.service';
import { getMe } from '../../services/faculty.service';

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
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'deadline_desc', label: 'Deadline (latest)' },
];

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function VerificationBadge({ badge }) {
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
            <VerificationBadge badge={opp.verificationBadge} />
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
        </div>

        <p className="text-sm text-text-muted line-clamp-3 leading-relaxed flex-1">
          {opp.description}
        </p>

        <div className="flex items-center justify-between mt-1 gap-4 flex-wrap">
          <div className="text-xs text-text-muted flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="capitalize">{opp.mode}</span>
              {opp.location ? ` · ${opp.location}` : ''}
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

  // Reset filters when the user switches pages (typeConfig changes)
  useEffect(() => {
    setFilters({ mode: '', cost: '', q: '', domain: '', deadlineWithin: '', sort: 'newest' });
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
    const query = {
      type: [typeConfig.type],
      mode: filters.mode,
      cost: filters.cost,
      q: filters.q,
      domain: filters.domain ? [filters.domain] : [],
      sort: filters.sort,
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
    setFilters({ mode: '', cost: '', q: '', domain: '', deadlineWithin: '', sort: 'newest' });
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
    return n;
  }, [filters]);

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
    </div>
  );
}
