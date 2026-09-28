import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Eye,
  Download,
  Loader2,
  Star,
  Building2,
  BadgeCheck,
  Mail,
  Phone,
  Award,
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  getApplicantProfile,
  downloadApplicantCv,
} from '../../services/job.service';

const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  closed: 'Closed',
};

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

function designationLabel(d) {
  if (!d) return 'Faculty';
  if (d === 'Professor') return 'Professor';
  return `${d} Professor`;
}

// Highlight the best value(s) across a row. `higherIsBetter=false` for
// applied date (earliest wins). Values that are null / undefined never
// win — an applicant with no publications recorded shouldn't be
// highlighted as "best" on the publications row.
function bestIndices(values, { higherIsBetter = true, dateAsc = false } = {}) {
  const filtered = values
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v != null && v !== '');
  if (filtered.length === 0) return new Set();
  let winner;
  if (dateAsc) {
    winner = filtered.reduce((best, cur) =>
      new Date(cur.v).getTime() < new Date(best.v).getTime() ? cur : best,
    ).v;
    return new Set(
      filtered
        .filter(({ v }) => new Date(v).getTime() === new Date(winner).getTime())
        .map(({ i }) => i),
    );
  }
  const nums = filtered.map(({ v }) => Number(v));
  winner = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  return new Set(
    filtered.filter(({ v }) => Number(v) === winner).map(({ i }) => i),
  );
}

function Cell({ children, highlight }) {
  return (
    <td
      className={`px-3 py-2 align-top text-sm border-b border-border ${
        highlight ? 'bg-primary/10 font-semibold text-primary' : 'text-text-light'
      }`}
    >
      {children}
    </td>
  );
}

function RowLabel({ children }) {
  return (
    <th
      scope="row"
      className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-text-muted font-semibold border-b border-border bg-muted/40 whitespace-nowrap sticky left-0 z-10"
    >
      {children}
    </th>
  );
}

/**
 * Side-by-side comparison of 2-4 applicants. Loads full profiles in
 * parallel via the existing per-applicant endpoint (no new backend
 * work needed — the summary shape already covers everything we
 * compare on). Rows highlight the "best" value per attribute so the
 * committee can rank at a glance without eyeballing every column.
 *
 * Actions in each column mirror the profile drawer: Open profile
 * (delegates back to the parent so the drawer takes over) and
 * Download CV. Status change stays out of scope — bulk-move already
 * covers that, and adding another status control here would drift the
 * modal into full profile-drawer territory.
 */
export default function ApplicantCompareModal({
  jobId,
  applicationIds,
  onClose,
  onOpenProfile,
}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all(applicationIds.map(id => getApplicantProfile(jobId, id)))
      .then(list => {
        if (!cancelled) setProfiles(list);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Failed to load applicants for comparison');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, applicationIds]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Highlight sets for the numeric rows. Recomputed only when profiles
  // change; the set-membership check inside Cell is O(1) anyway.
  const highlights = useMemo(() => {
    if (profiles.length === 0) return {};
    return {
      rating: bestIndices(profiles.map(p => p.application?.averageRating)),
      publications: bestIndices(profiles.map(p => p.publicationCount)),
      citations: bestIndices(profiles.map(p => p.citationCount)),
      hIndex: bestIndices(profiles.map(p => p.hIndex)),
      i10: bestIndices(profiles.map(p => p.i10Index)),
      applied: bestIndices(profiles.map(p => p.application?.appliedAt), { dateAsc: true }),
      experience: bestIndices(
        profiles.map(p => {
          const emp = p.employmentHistory || [];
          if (emp.length === 0) return null;
          const earliestFrom = emp
            .map(e => e.from)
            .filter(Number.isFinite)
            .reduce((min, y) => (min == null ? y : Math.min(min, y)), null);
          return earliestFrom ? new Date().getFullYear() - earliestFrom : null;
        }),
      ),
    };
  }, [profiles]);

  const onDownloadCv = async appId => {
    if (downloadingId) return;
    setDownloadingId(appId);
    try {
      await downloadApplicantCv(jobId, appId);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'CV download failed');
    } finally {
      setDownloadingId('');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="cmp-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50"
      />
      <motion.div
        key="cmp-modal"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-4 md:inset-10 z-50 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div>
            <div id="compare-title" className="text-sm font-bold text-secondary">
              Compare applicants
            </div>
            <div className="text-xs text-text-muted">
              Highest value in each row is highlighted. Applied date shows earliest as best.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="p-1.5 rounded-md text-text-muted hover:text-text-light hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading applicants…
            </div>
          ) : error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-20 shadow-sm">
                <tr>
                  <th className="px-3 py-3 text-left text-[11px] uppercase tracking-wider text-text-muted font-semibold border-b border-border bg-muted/40 sticky left-0 z-30 w-[160px] min-w-[160px]">
                    Attribute
                  </th>
                  {profiles.map(p => (
                    <th
                      key={p.application?.id}
                      className="px-3 py-3 text-left border-b border-border align-top min-w-[220px]"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-secondary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {initialsOf(p.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm text-text-light truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-text-muted truncate">
                            {designationLabel(p.designation)}
                          </div>
                          {p.institution?.name && (
                            <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1 truncate">
                              <Building2 size={10} />
                              <span className="truncate">{p.institution.name}</span>
                              {p.institution.verificationStatus === 'verified' && (
                                <BadgeCheck size={10} className="text-success shrink-0" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenProfile?.(p.application?.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-primary/40 text-primary hover:bg-primary/5 text-[10px] font-semibold px-1.5 py-1"
                        >
                          <Eye size={10} /> Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadCv(p.application?.id)}
                          disabled={downloadingId === p.application?.id}
                          className="inline-flex items-center justify-center gap-1 rounded-md border border-border hover:bg-muted text-text-light text-[10px] font-semibold px-1.5 py-1 disabled:opacity-60"
                        >
                          {downloadingId === p.application?.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Download size={10} />
                          )}
                          CV
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <RowLabel>Contact</RowLabel>
                  {profiles.map(p => (
                    <Cell key={p.application?.id}>
                      <div className="space-y-0.5 text-xs">
                        {p.email && (
                          <div className="flex items-center gap-1 text-primary truncate">
                            <Mail size={10} /> {p.email}
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center gap-1 text-text-muted">
                            <Phone size={10} /> {p.phone}
                          </div>
                        )}
                        {!p.email && !p.phone && (
                          <span className="text-text-muted italic">Not on file</span>
                        )}
                      </div>
                    </Cell>
                  ))}
                </tr>
                <tr>
                  <RowLabel>Status</RowLabel>
                  {profiles.map(p => (
                    <Cell key={p.application?.id}>
                      <span className="inline-flex items-center rounded-full bg-muted text-text-light border border-border px-2 py-0.5 text-[11px] font-semibold uppercase">
                        {STATUS_LABELS[p.application?.status] || p.application?.status}
                      </span>
                    </Cell>
                  ))}
                </tr>
                <tr>
                  <RowLabel>Committee rating</RowLabel>
                  {profiles.map((p, i) => {
                    const r = p.application?.averageRating;
                    const count = p.application?.ratingCount || 0;
                    return (
                      <Cell key={p.application?.id} highlight={highlights.rating?.has(i)}>
                        {r != null ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Star
                              size={12}
                              className={
                                highlights.rating?.has(i)
                                  ? 'fill-yellow-400 text-yellow-500'
                                  : 'text-yellow-500'
                              }
                            />
                            {r.toFixed(1)} / 5
                            <span className="font-normal text-text-muted">({count})</span>
                          </span>
                        ) : (
                          <span className="text-text-muted italic">No ratings</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>Publications</RowLabel>
                  {profiles.map((p, i) => (
                    <Cell key={p.application?.id} highlight={highlights.publications?.has(i)}>
                      <span className="tabular-nums">{p.publicationCount ?? 0}</span>
                    </Cell>
                  ))}
                </tr>
                <tr>
                  <RowLabel>Citations</RowLabel>
                  {profiles.map((p, i) => {
                    const unreconciled =
                      p.publicationCount === 0 &&
                      (p.citationCount || p.hIndex || p.i10Index);
                    return (
                      <Cell
                        key={p.application?.id}
                        highlight={!unreconciled && highlights.citations?.has(i)}
                      >
                        {unreconciled ? (
                          <span className="text-text-muted italic">—</span>
                        ) : (
                          <span className="tabular-nums">{p.citationCount ?? 0}</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>h-index</RowLabel>
                  {profiles.map((p, i) => {
                    const unreconciled =
                      p.publicationCount === 0 &&
                      (p.citationCount || p.hIndex || p.i10Index);
                    return (
                      <Cell
                        key={p.application?.id}
                        highlight={!unreconciled && highlights.hIndex?.has(i)}
                      >
                        {unreconciled ? (
                          <span className="text-text-muted italic">—</span>
                        ) : (
                          <span className="tabular-nums">{p.hIndex ?? 0}</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>i10-index</RowLabel>
                  {profiles.map((p, i) => {
                    const unreconciled =
                      p.publicationCount === 0 &&
                      (p.citationCount || p.hIndex || p.i10Index);
                    return (
                      <Cell
                        key={p.application?.id}
                        highlight={!unreconciled && highlights.i10?.has(i)}
                      >
                        {unreconciled ? (
                          <span className="text-text-muted italic">—</span>
                        ) : (
                          <span className="tabular-nums">{p.i10Index ?? 0}</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>Experience</RowLabel>
                  {profiles.map((p, i) => {
                    const emp = p.employmentHistory || [];
                    const earliest = emp
                      .map(e => e.from)
                      .filter(Number.isFinite)
                      .reduce((min, y) => (min == null ? y : Math.min(min, y)), null);
                    const years = earliest ? new Date().getFullYear() - earliest : null;
                    return (
                      <Cell
                        key={p.application?.id}
                        highlight={highlights.experience?.has(i)}
                      >
                        {years != null ? (
                          <span className="tabular-nums">{years} yrs</span>
                        ) : (
                          <span className="text-text-muted italic">Not on file</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>Domain tags</RowLabel>
                  {profiles.map(p => (
                    <Cell key={p.application?.id}>
                      {(p.domainTags || []).length === 0 ? (
                        <span className="text-text-muted italic text-xs">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.domainTags.slice(0, 6).map(t => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 border border-primary/10"
                            >
                              {t}
                            </span>
                          ))}
                          {p.domainTags.length > 6 && (
                            <span className="text-[10px] text-text-muted">
                              +{p.domainTags.length - 6}
                            </span>
                          )}
                        </div>
                      )}
                    </Cell>
                  ))}
                </tr>
                <tr>
                  <RowLabel>Top degree</RowLabel>
                  {profiles.map(p => {
                    const top = [...(p.education || [])].sort(
                      (a, b) => (b.year || 0) - (a.year || 0),
                    )[0];
                    return (
                      <Cell key={p.application?.id}>
                        {top ? (
                          <div className="text-xs">
                            <div className="font-semibold text-text-light">
                              {top.degree}
                              {top.field ? ` · ${top.field}` : ''}
                            </div>
                            <div className="text-text-muted">
                              {[top.institution, top.year].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-muted italic text-xs">Not on file</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>Current role</RowLabel>
                  {profiles.map(p => {
                    const cur =
                      (p.employmentHistory || []).find(e => e.current) ||
                      [...(p.employmentHistory || [])].sort(
                        (a, b) => (b.to || 9999) - (a.to || 9999),
                      )[0];
                    return (
                      <Cell key={p.application?.id}>
                        {cur ? (
                          <div className="text-xs">
                            <div className="font-semibold text-text-light">
                              {cur.designation || 'Faculty'}
                            </div>
                            <div className="text-text-muted">{cur.institution}</div>
                          </div>
                        ) : (
                          <span className="text-text-muted italic text-xs">Not on file</span>
                        )}
                      </Cell>
                    );
                  })}
                </tr>
                <tr>
                  <RowLabel>Awards</RowLabel>
                  {profiles.map(p => (
                    <Cell key={p.application?.id}>
                      {(p.awards || []).length === 0 ? (
                        <span className="text-text-muted italic text-xs">None</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Award size={11} className="text-secondary" />
                          {p.awards.length}
                        </span>
                      )}
                    </Cell>
                  ))}
                </tr>
                <tr>
                  <RowLabel>Applied</RowLabel>
                  {profiles.map((p, i) => (
                    <Cell key={p.application?.id} highlight={highlights.applied?.has(i)}>
                      <span className="text-xs tabular-nums">
                        {new Date(p.application?.appliedAt).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </Cell>
                  ))}
                </tr>
                <tr>
                  <RowLabel>Shared notes</RowLabel>
                  {profiles.map(p => (
                    <Cell key={p.application?.id}>
                      {p.application?.notes ? (
                        <p className="text-xs text-text-light leading-relaxed line-clamp-4">
                          {p.application.notes}
                        </p>
                      ) : (
                        <span className="text-text-muted italic text-xs">None</span>
                      )}
                    </Cell>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <footer className="border-t border-border px-5 py-3 shrink-0 flex items-center justify-between bg-muted/30">
          <div className="text-xs text-text-muted">
            Comparing {profiles.length || applicationIds.length} applicant
            {applicationIds.length === 1 ? '' : 's'}
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
