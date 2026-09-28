import React, { useEffect, useMemo, useState } from 'react';
import {
  KanbanSquare,
  Eye,
  Download,
  Loader2,
  Star,
  MessageSquare,
  Filter as FilterIcon,
  ArrowUpDown,
  X,
  CheckSquare,
  Columns3,
} from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { Alert, AlertDescription } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  listJobs,
  listApplicants,
  updateApplicationStatus,
  downloadApplicantCv,
  bulkSetApplicationStatus,
} from '../../services/job.service';
import ApplicantProfileModal from './ApplicantProfileModal';
import ApplicantCompareModal from './ApplicantCompareModal';

// Compare fits 2-4 applicants comfortably in the grid; more than 4
// pushes columns below ~180px wide and stops being scannable.
const COMPARE_MIN = 2;
const COMPARE_MAX = 4;

const COLUMNS = [
  { key: 'applied', label: 'Applied', tone: 'bg-primary/5 border-primary/20' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'bg-yellow-50 border-yellow-200' },
  { key: 'interview', label: 'Interview', tone: 'bg-accent/5 border-accent/20' },
  { key: 'closed', label: 'Closed', tone: 'bg-muted border-border' },
];

// Sort spec applied across every column. Rating sorts push unrated
// applicants to the bottom so admins don't have to visually filter
// them out. h-index / citations fall back to 0 when the applicant
// hasn't reconciled publications yet.
const SORT_OPTIONS = [
  { value: 'applied_desc', label: 'Newest applications' },
  { value: 'applied_asc', label: 'Oldest applications' },
  { value: 'rating_desc', label: 'Highest committee rating' },
  { value: 'rating_asc', label: 'Lowest committee rating' },
  { value: 'h_index_desc', label: 'Highest h-index' },
  { value: 'citations_desc', label: 'Most citations' },
];

const RATING_FILTER_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 3, label: '≥ 3 stars' },
  { value: 4, label: '≥ 4 stars' },
  { value: 5, label: '5 stars only' },
];

const EMPTY_FILTERS = { minRating: 0, minHIndex: '', domainQuery: '' };

function sortApplications(list, sortKey) {
  const arr = [...list];
  const cmpNumDesc = (a, b) => (b ?? -Infinity) - (a ?? -Infinity);
  const cmpNumAsc = (a, b) => (a ?? Infinity) - (b ?? Infinity);
  const cmpDate = (a, b) => new Date(a).getTime() - new Date(b).getTime();
  switch (sortKey) {
    case 'applied_asc':
      return arr.sort((a, b) => cmpDate(a.appliedAt, b.appliedAt));
    case 'rating_desc':
      return arr.sort((a, b) => cmpNumDesc(a.averageRating, b.averageRating));
    case 'rating_asc':
      // Unrated go to the bottom for _asc too — sorting the lowest to
      // the top otherwise buries the applicants who need review most.
      return arr.sort((a, b) => {
        const av = a.averageRating ?? Infinity;
        const bv = b.averageRating ?? Infinity;
        return av - bv;
      });
    case 'h_index_desc':
      return arr.sort((a, b) => cmpNumDesc(a.faculty?.hIndex, b.faculty?.hIndex));
    case 'citations_desc':
      return arr.sort((a, b) => cmpNumDesc(a.faculty?.citationCount, b.faculty?.citationCount));
    case 'applied_desc':
    default:
      return arr.sort((a, b) => cmpDate(b.appliedAt, a.appliedAt));
  }
}

function filterApplications(list, filters) {
  const minH = Number.parseInt(filters.minHIndex, 10);
  const hasMinH = Number.isFinite(minH) && minH > 0;
  const domainQ = filters.domainQuery.trim().toLowerCase();
  return list.filter(a => {
    if (filters.minRating > 0) {
      // Rating filter treats unrated as failing — they're excluded when
      // an admin asks for "≥ 4 stars", otherwise the filter is useless.
      const r = a.averageRating;
      if (r == null || r < filters.minRating) return false;
    }
    if (hasMinH) {
      const h = a.faculty?.hIndex ?? 0;
      if (h < minH) return false;
    }
    if (domainQ) {
      const tags = (a.faculty?.domainTags || []).map(t => t.toLowerCase());
      if (!tags.some(t => t.includes(domainQ))) return false;
    }
    return true;
  });
}

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

function ApplicantCard({
  application,
  jobId,
  onMoved,
  onOpenProfile,
  isSelected,
  onToggleSelect,
}) {
  const [busy, setBusy] = useState(false);
  const [downloadingCv, setDownloadingCv] = useState(false);
  const [error, setError] = useState('');
  const fac = application.faculty;

  const move = async newStatus => {
    if (newStatus === application.status || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await updateApplicationStatus(jobId, application.id, { status: newStatus });
      onMoved(updated);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Move failed');
    } finally {
      setBusy(false);
    }
  };

  const onCvDownload = async () => {
    if (downloadingCv) return;
    setDownloadingCv(true);
    setError('');
    try {
      await downloadApplicantCv(jobId, application.id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'CV download failed');
    } finally {
      setDownloadingCv(false);
    }
  };

  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm space-y-2 transition-colors ${
        isSelected ? 'border-primary/60 ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(application.id)}
          aria-label={`Select ${fac?.name || 'applicant'} for bulk action`}
          className="mt-1 h-3.5 w-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary shrink-0 cursor-pointer"
        />
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
          {initialsOf(fac?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-text-light truncate">
            {fac?.name || '(unknown)'}
          </div>
          <div className="text-xs text-text-muted truncate">
            {fac?.designation === 'Professor'
              ? 'Professor'
              : `${fac?.designation || ''} Professor`.trim()}
          </div>
        </div>
      </div>

      {fac?.domainTags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fac.domainTags.slice(0, 3).map(t => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 border border-primary/10"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="text-[11px] text-text-muted">
        {typeof fac?.citationCount === 'number' && (
          <>
            Citations {fac.citationCount} · h {fac.hIndex}
          </>
        )}
      </div>
      <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
        <span>Applied {new Date(application.appliedAt).toLocaleDateString()}</span>
        {application.ratingCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-yellow-600 font-semibold tabular-nums">
            <Star size={10} className="fill-yellow-400 text-yellow-500" />
            {application.averageRating?.toFixed(1)}
            <span className="text-text-muted font-normal">
              ({application.ratingCount})
            </span>
          </span>
        )}
        {application.notes && (
          <span
            className="inline-flex items-center text-primary"
            title="Committee notes on file"
          >
            <MessageSquare size={10} />
          </span>
        )}
      </div>

      {error && <div className="text-[11px] text-danger">{error}</div>}

      {/* Review actions — in-app profile + CV replace the old external
          ORCID link. External ORCID / DOI links still surface inside
          the profile drawer for admins who want them. */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onOpenProfile(application.id)}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-primary/40 text-primary hover:bg-primary/5 text-[11px] font-semibold px-2 py-1 transition-colors"
        >
          <Eye size={11} /> Profile
        </button>
        <button
          type="button"
          onClick={onCvDownload}
          disabled={downloadingCv}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-border hover:bg-muted text-text-light text-[11px] font-semibold px-2 py-1 transition-colors disabled:opacity-60"
        >
          {downloadingCv ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          {downloadingCv ? 'Wait…' : 'CV'}
        </button>
      </div>

      <select
        value={application.status}
        onChange={e => move(e.target.value)}
        disabled={busy}
        className="w-full text-xs rounded-md border border-border bg-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {COLUMNS.map(c => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ApplicantsKanban({ initialJobId = '' }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openApplicationId, setOpenApplicationId] = useState(null);
  const [sortKey, setSortKey] = useState('applied_desc');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Set of selected application ids for bulk-move. Cleared on job
  // switch (below) and after a successful bulk operation.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [compareIds, setCompareIds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await listJobs({ include_expired: 'true', limit: 50 });
        if (cancelled) return;
        setJobs(result.jobs);
        if (!selectedJobId && result.jobs[0]) setSelectedJobId(result.jobs[0].id);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Could not load jobs');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialJobId && initialJobId !== selectedJobId) setSelectedJobId(initialJobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId]);

  useEffect(() => {
    if (!selectedJobId) return;
    let cancelled = false;
    setLoading(true);
    // Reset filters when switching jobs — stale filter chips against a
    // fresh applicant pool are worse than making the admin reapply.
    setFilters(EMPTY_FILTERS);
    setSelectedIds(new Set());
    setBulkFeedback('');
    listApplicants(selectedJobId)
      .then(result => {
        if (!cancelled) setApplications(result.applications);
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load applicants');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedJobId]);

  const onMoved = updated => {
    setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  };

  // Apply filter → sort → group. Memoised so drag-updates on cards
  // (which trigger a re-render via setApplications) don't re-run the
  // sort unless the input array actually changed.
  const visibleApplications = useMemo(
    () => sortApplications(filterApplications(applications, filters), sortKey),
    [applications, filters, sortKey],
  );
  const activeFilterCount =
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minHIndex ? 1 : 0) +
    (filters.domainQuery.trim() ? 1 : 0);

  const groupedByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = visibleApplications.filter(a => a.status === col.key);
    return acc;
  }, {});

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const toggleSelect = id => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setBulkFeedback('');
  };
  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkFeedback('');
  };
  const selectAllVisible = () => {
    setSelectedIds(new Set(visibleApplications.map(a => a.id)));
  };

  const runBulkMove = async targetStatus => {
    if (selectedIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    setBulkFeedback('');
    setError('');
    try {
      const ids = Array.from(selectedIds);
      const result = await bulkSetApplicationStatus(selectedJobId, ids, targetStatus);
      // Optimistic in-place update — cheaper than a full refetch, and
      // we already know the target status for every id we submitted.
      setApplications(prev =>
        prev.map(a => (selectedIds.has(a.id) ? { ...a, status: targetStatus } : a)),
      );
      const msg = [
        `${result.mutated} moved to ${targetStatus}`,
        result.unchanged > 0 ? `${result.unchanged} already there` : '',
        result.skippedCrossJob > 0 ? `${result.skippedCrossJob} skipped` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      setBulkFeedback(msg);
      clearSelection();
      // Auto-clear the toast after 3s so it doesn't linger.
      setTimeout(() => setBulkFeedback(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Bulk move failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    visibleApplications.length > 0 && visibleApplications.every(a => selectedIds.has(a.id));

  const jobSelector = (
    <div className="flex items-center gap-2">
      <label htmlFor="job-select" className="text-xs uppercase text-text-muted font-semibold">
        Job
      </label>
      <select
        id="job-select"
        value={selectedJobId}
        onChange={e => setSelectedJobId(e.target.value)}
        className="text-sm rounded-md border border-border bg-white px-2 py-1 min-w-[220px] max-w-[280px] truncate"
      >
        <option value="">Select a job</option>
        {jobs.map(j => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <SectionCard
      title="Applicant pipeline"
      subtitle="Move applicants across stages by changing the status on their card."
      trailing={jobSelector}
    >
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {bulkFeedback && (
        <div className="mb-3 rounded-md bg-success/10 border border-success/30 text-success text-xs font-semibold px-3 py-2">
          {bulkFeedback}
        </div>
      )}

      {selectedJobId && applications.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={13} className="text-text-muted" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value)}
                className="text-xs rounded-md border border-border bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Sort applicants"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(v => !v)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-colors ${
                activeFilterCount > 0
                  ? 'border-primary/40 text-primary bg-primary/5'
                  : 'border-border text-text-muted hover:bg-muted'
              }`}
            >
              <FilterIcon size={13} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold w-4 h-4">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-danger"
              >
                <X size={11} /> Clear
              </button>
            )}
            <div className="ml-auto text-[11px] text-text-muted tabular-nums">
              Showing {visibleApplications.length} of {applications.length}
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 flex items-center gap-2 flex-wrap">
              <CheckSquare size={14} className="text-primary shrink-0" />
              <span className="text-sm font-semibold text-secondary">
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={selectAllVisible}
                disabled={allVisibleSelected}
                className="text-[11px] text-primary hover:underline disabled:opacity-50"
              >
                Select all visible ({visibleApplications.length})
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] text-text-muted hover:text-danger"
              >
                Clear
              </button>
              <div className="ml-auto flex items-center gap-1.5 flex-wrap">
                {selectedCount >= COMPARE_MIN && selectedCount <= COMPARE_MAX && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCompareIds(Array.from(selectedIds))}
                    disabled={bulkBusy}
                    className="text-[11px] h-7 border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <Columns3 size={11} className="mr-1" /> Compare
                  </Button>
                )}
                {selectedCount > COMPARE_MAX && (
                  <span className="text-[11px] text-text-muted italic">
                    Compare limited to {COMPARE_MAX} — deselect some
                  </span>
                )}
                <span className="text-[11px] text-text-muted mr-1 ml-1">Move to:</span>
                {COLUMNS.map(col => (
                  <Button
                    key={col.key}
                    size="sm"
                    variant="outline"
                    disabled={bulkBusy}
                    onClick={() => runBulkMove(col.key)}
                    className="text-[11px] h-7"
                  >
                    {bulkBusy ? <Loader2 size={11} className="animate-spin" /> : col.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {filtersOpen && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                  Committee rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))
                  }
                  className="w-full text-xs rounded-md border border-border bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {RATING_FILTER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                  Min. h-index
                </label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={filters.minHIndex}
                  onChange={e => setFilters(prev => ({ ...prev, minHIndex: e.target.value }))}
                  placeholder="Any"
                  className="w-full text-xs rounded-md border border-border bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                  Domain tag contains
                </label>
                <input
                  type="text"
                  value={filters.domainQuery}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, domainQuery: e.target.value }))
                  }
                  placeholder="e.g. NLP"
                  className="w-full text-xs rounded-md border border-border bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedJobId ? (
        <EmptyState
          icon={<KanbanSquare size={20} />}
          title={jobs.length === 0 ? 'No jobs yet' : 'Select a job'}
          description={
            jobs.length === 0
              ? 'Use the Post Job tab to create your first opening.'
              : 'Pick a job from the dropdown above to see its applicant pipeline.'
          }
        />
      ) : loading ? (
        <div className="text-sm text-text-muted">Loading applicants…</div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare size={20} />}
          title="No applications yet"
          description="When faculty apply to this posting, they'll appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map(col => (
            <div key={col.key} className={`rounded-lg border p-3 space-y-2 ${col.tone}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  {col.label}
                </div>
                <span className="text-xs font-semibold text-text-muted tabular-nums bg-white/60 rounded-full px-2 py-0.5">
                  {groupedByStatus[col.key].length}
                </span>
              </div>
              {groupedByStatus[col.key].map(app => (
                <ApplicantCard
                  key={app.id}
                  application={app}
                  jobId={selectedJobId}
                  onMoved={onMoved}
                  onOpenProfile={setOpenApplicationId}
                  isSelected={selectedIds.has(app.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
              {groupedByStatus[col.key].length === 0 && (
                <div className="text-[11px] text-text-muted italic py-2 text-center">
                  No applicants here
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openApplicationId && (
        <ApplicantProfileModal
          jobId={selectedJobId}
          applicationId={openApplicationId}
          onClose={() => setOpenApplicationId(null)}
        />
      )}

      {compareIds && (
        <ApplicantCompareModal
          jobId={selectedJobId}
          applicationIds={compareIds}
          onClose={() => setCompareIds(null)}
          onOpenProfile={appId => {
            // Chain to the profile drawer without unmounting the compare
            // modal — closing compare after handing off would surprise
            // an admin who wants to bounce back after a quick read.
            setOpenApplicationId(appId);
          }}
        />
      )}
    </SectionCard>
  );
}
