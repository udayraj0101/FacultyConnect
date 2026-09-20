import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Users2,
  BadgeCheck,
  Sparkles,
  ArrowRight,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  Handshake,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import HeroBanner from '../components/dashboard/HeroBanner';
import SectionCard from '../components/dashboard/SectionCard';
import { searchDirectory } from '../services/directory.service';
import { listInstitutions } from '../services/institution.service';
import { getMe } from '../services/faculty.service';
import { OPEN_TO_META, OPEN_TO_ORDER } from '../lib/openTo';

const DESIGNATION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'Assistant', label: 'Assistant Professor' },
  { value: 'Associate', label: 'Associate Professor' },
  { value: 'Professor', label: 'Professor' },
  { value: 'Guest', label: 'Guest Professor' },
  { value: 'Research', label: 'Research' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'citations', label: 'Most citations' },
  { value: 'hIndex', label: 'Highest h-index' },
  { value: 'publications', label: 'Most publications' },
  { value: 'name', label: 'Name (A–Z)' },
];

function ProfileCard({ profile, index }) {
  const initials = (profile.name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .join('')
    .toUpperCase();

  return (
    <motion.article
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: Math.min(index, 6) * 0.03 }}
      className="rounded-xl bg-white border border-border hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <Link
        to={`/directory/${profile.id}`}
        className="p-5 flex flex-col gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm"
            style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-text-light leading-tight truncate">{profile.name}</h3>
            <div className="text-xs text-text-muted mt-0.5">
              {profile.designation === 'Professor'
                ? 'Professor'
                : `${profile.designation} Professor`}
              {profile.department ? ` · ${profile.department}` : ''}
            </div>
            {profile.institution && (
              <div className="text-xs text-text-muted mt-1 flex items-center gap-1 truncate">
                <Building2 size={11} />
                <span className="truncate">{profile.institution.name}</span>
                {profile.institution.verificationStatus === 'verified' && (
                  <BadgeCheck size={11} className="text-success shrink-0" />
                )}
              </div>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{profile.bio}</p>
        )}

        {profile.domainTags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.domainTags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary/5 text-primary text-[11px] px-2 py-0.5 border border-primary/10"
              >
                {tag}
              </span>
            ))}
            {profile.domainTags.length > 4 && (
              <span className="text-[11px] text-text-muted">+{profile.domainTags.length - 4}</span>
            )}
          </div>
        )}

        {profile.openTo?.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <Handshake size={11} className="text-primary shrink-0" />
            {profile.openTo.map(key => {
              const meta = OPEN_TO_META[key];
              if (!meta) return null;
              return (
                <span
                  key={key}
                  title={meta.long}
                  className="inline-flex items-center rounded-full bg-success/10 text-success text-[10px] px-2 py-0.5 border border-success/20 font-semibold"
                >
                  {meta.short}
                </span>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
          <div>
            <div className="text-sm font-bold text-secondary tabular-nums">
              {profile.publicationCount}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Pubs</div>
          </div>
          <div>
            <div className="text-sm font-bold text-secondary tabular-nums">{profile.hIndex}</div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">h-index</div>
          </div>
          <div>
            <div className="text-sm font-bold text-secondary tabular-nums">
              {profile.citationCount}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider">Cites</div>
          </div>
        </div>

        <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-primary">
          View profile <ArrowRight size={12} />
        </span>
      </Link>
    </motion.article>
  );
}

export default function Directory() {
  // Deep-link support: the Co-PI finder on grant detail pushes
  // ?open_to=co_pi&domain=<tag>&exclude_same_institution=true here.
  // We prime the filter state from the URL on first load so a shared
  // link opens directly filtered.
  const [searchParams] = useSearchParams();
  const initialOpenTo = (searchParams.get('open_to') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const [filters, setFilters] = useState({
    q: '',
    domain: searchParams.get('domain') || '',
    designation: '',
    institutionId: '',
    open_to: initialOpenTo,
    exclude_same_institution: searchParams.get('exclude_same_institution') === 'true',
    sort: 'relevance',
  });
  const [pendingQuery, setPendingQuery] = useState('');
  const [pendingDomain, setPendingDomain] = useState(searchParams.get('domain') || '');
  const [data, setData] = useState({ results: [], total: 0 });
  const [institutions, setInstitutions] = useState([]);
  const [myTags, setMyTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listInstitutions({ verifiedOnly: 'true', limit: 50 });
        if (!cancelled) setInstitutions(res.institutions || []);
      } catch {
        /* non-fatal */
      }
      try {
        const me = await getMe();
        if (!cancelled) setMyTags(me.domainTags || []);
      } catch {
        /* non-fatal — my-tag chips just won't render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchDirectory(filters)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Search failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const applySearch = e => {
    e.preventDefault();
    setFilters(prev => ({
      ...prev,
      q: pendingQuery.trim(),
      domain: pendingDomain.trim(),
    }));
  };

  const setDomainFromChip = domain => {
    setPendingDomain(domain);
    setFilters(prev => ({ ...prev, domain }));
  };

  const clearFilters = () => {
    setFilters({
      q: '',
      domain: '',
      designation: '',
      institutionId: '',
      open_to: [],
      exclude_same_institution: false,
      sort: 'relevance',
    });
    setPendingQuery('');
    setPendingDomain('');
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.q) n += 1;
    if (filters.domain) n += 1;
    if (filters.designation) n += 1;
    if (filters.institutionId) n += 1;
    if (filters.open_to?.length) n += filters.open_to.length;
    if (filters.exclude_same_institution) n += 1;
    return n;
  }, [filters]);

  const toggleOpenTo = key => {
    setFilters(prev => {
      const current = prev.open_to || [];
      const next = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, open_to: next };
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title="Faculty Directory"
        subtitle="Find collaborators by research area, institution, or designation. Contact details stay hidden until you send a connect request and it's accepted."
        icon={<Users2 strokeWidth={1.4} />}
        stats={[
          { icon: <Users2 size={18} />, value: data.total, label: 'Profiles matching' },
          { icon: <Sparkles size={18} />, value: activeFilterCount, label: 'Filters active' },
        ]}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Toolbar: filter toggle + sort + count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-border px-4 py-2 text-sm font-semibold text-text-light hover:border-primary/40 hover:text-primary transition-colors"
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[10px] font-bold text-white bg-primary">
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
                Showing <span className="font-semibold text-text-light">{data.total}</span> profile
                {data.total === 1 ? '' : 's'}
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
          <SectionCard title="Filters" subtitle="Narrow the search">
            <form onSubmit={applySearch} className="space-y-5">
              {/* My research areas — quick chips */}
              {myTags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                    My research areas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {myTags.slice(0, 6).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setDomainFromChip(tag)}
                        className={`inline-flex items-center rounded-full text-[11px] px-2.5 py-1 border transition-colors ${
                          filters.domain === tag
                            ? 'bg-primary text-white border-primary'
                            : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted mt-1.5">
                    Click a tag to find peers in that area.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                  Keyword
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <Input
                    placeholder="Name, area, or bio text"
                    value={pendingQuery}
                    onChange={e => setPendingQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                  Research domain
                </label>
                <Input
                  placeholder="e.g. Machine Learning"
                  value={pendingDomain}
                  onChange={e => setPendingDomain(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                  Designation
                </label>
                <select
                  value={filters.designation}
                  onChange={e => setFilters(prev => ({ ...prev, designation: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DESIGNATION_OPTIONS.map(o => (
                    <option key={o.value || 'any'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                  Institution
                </label>
                <select
                  value={filters.institutionId}
                  onChange={e => setFilters(prev => ({ ...prev, institutionId: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Any institution</option>
                  {institutions.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 inline-flex items-center gap-1.5">
                  <Handshake size={11} /> Open to
                </div>
                <div className="space-y-1">
                  {OPEN_TO_ORDER.map(key => {
                    const checked = filters.open_to?.includes(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                        title={OPEN_TO_META[key].hint}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOpenTo(key)}
                          className="accent-primary"
                        />
                        {OPEN_TO_META[key].long}
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-muted mt-1.5">
                  Faculty who declared they welcome these requests.
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm cursor-pointer py-0.5 border-t border-border pt-4">
                <input
                  type="checkbox"
                  checked={filters.exclude_same_institution}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      exclude_same_institution: e.target.checked,
                    }))
                  }
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="font-semibold text-text-light block">
                    Different institution only
                  </span>
                  <span className="text-[11px] text-text-muted leading-relaxed">
                    Hide peers from your own institution — useful when hunting Co-PIs for
                    multi-institution grants.
                  </span>
                </span>
              </label>

              <Button type="submit" size="sm" className="w-full">
                Apply search
              </Button>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={clearFilters}
                >
                  Clear filters ({activeFilterCount})
                </Button>
              )}
            </form>
          </SectionCard>
        )}

        <section>
          {loading && <SkeletonList count={6} cardLines={3} />}

          {!loading && data.results.length === 0 && (
            <EmptyState
              icon={<Search size={20} />}
              title="No profiles match"
              description={
                myTags.length > 0
                  ? "Only faculty who've opted into directory visibility appear here. Try one of your research-area chips, or broaden the filters."
                  : "Only faculty who've opted into directory visibility appear here. Try broader filters or clear them."
              }
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
              filtersOpen
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {data.results.map((profile, i) => (
              <ProfileCard key={profile.id} profile={profile} index={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
