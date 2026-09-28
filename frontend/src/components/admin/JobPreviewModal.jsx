import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Building2,
  MapPin,
  IndianRupee,
  CalendarClock,
  Users,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';

const DESIGNATION_COLOR = {
  Assistant: '#6C5CE7',
  Associate: '#00B894',
  Professor: '#1A237E',
  Guest: '#F59E0B',
  Research: '#64748B',
};

function daysUntil(deadline) {
  if (!deadline) return 0;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// Mirrors the JobBoard's VacancyBreakdown so preview parity is honest.
// Hidden when there's no reservation set AND vacancies is 1 (private-
// institution single-seat case).
function VacancyBreakdown({ vacancies, reservation }) {
  const r = reservation || {};
  const anyReservation =
    (r.UR || 0) + (r.SC || 0) + (r.ST || 0) + (r.OBC || 0) + (r.EWS || 0) + (r.PwD || 0) > 0;
  if (!anyReservation && (!vacancies || vacancies <= 1)) return null;
  const parts = [];
  if (r.UR) parts.push(`UR-${r.UR}`);
  if (r.SC) parts.push(`SC-${r.SC}`);
  if (r.ST) parts.push(`ST-${r.ST}`);
  if (r.OBC) parts.push(`OBC-${r.OBC}`);
  if (r.EWS) parts.push(`EWS-${r.EWS}`);
  return (
    <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1 font-semibold text-text-light">
        <Users size={12} /> {vacancies} vacanc{vacancies === 1 ? 'y' : 'ies'}
      </span>
      {parts.length > 0 && <span>({parts.join(' · ')})</span>}
      {r.PwD > 0 && (
        <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
          +{r.PwD} PwD
        </span>
      )}
    </div>
  );
}

/**
 * Preview modal — renders a mock JobBoard card from the in-progress
 * form payload so the admin can see exactly what faculty will see
 * before hitting Publish or Save-as-draft. Doesn't hit the server;
 * we're rendering from local form state, so this works even for
 * postings that haven't been saved yet.
 *
 * Layout deliberately mirrors JobBoard.jsx's JobCard — if that card's
 * visual language changes, we'll need to update this stub too. Kept
 * inline (not a shared component) because the JobCard has apply
 * buttons, report affordances, and "already applied" state that don't
 * belong in a preview.
 */
export default function JobPreviewModal({ payload, onClose }) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const days = daysUntil(payload.deadline);
  const color = DESIGNATION_COLOR[payload.designation] || '#6C5CE7';

  return (
    <AnimatePresence>
      <motion.div
        key="preview-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50"
      />
      <motion.div
        key="preview-modal"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <div
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border shrink-0 bg-muted/30">
            <div>
              <div id="preview-title" className="text-sm font-bold text-secondary">
                Preview — Faculty view
              </div>
              <div className="text-[11px] text-text-muted">
                This is what applicants will see on the Job Board.
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 rounded-md text-text-muted hover:text-text-light hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </header>

          <div className="p-4 bg-[#F8FAFC]">
            {/* Mock JobBoard card */}
            <article className="relative rounded-xl bg-white border border-border overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
              <div className="pl-5 pr-5 py-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-light leading-snug">
                      {payload.title || 'Untitled posting'}
                    </h3>
                    <div className="text-sm text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Building2 size={13} /> Your institution
                      </span>
                      <span className="inline-flex items-center gap-1 text-success text-xs">
                        <BadgeCheck size={12} /> Verified
                      </span>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {payload.designation}
                  </span>
                </div>

                <div className="text-sm text-text-muted flex items-center gap-3 flex-wrap">
                  <span>{payload.department || '—'}</span>
                  {payload.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} /> {payload.location}
                    </span>
                  )}
                  {payload.experienceYears ? (
                    <span>· {payload.experienceYears}+ years</span>
                  ) : null}
                </div>

                <p className="text-sm text-text-muted line-clamp-3 leading-relaxed">
                  {payload.description || '(No description yet)'}
                </p>

                {payload.domainTags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {payload.domainTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary/5 text-primary text-[11px] px-2 py-0.5 border border-primary/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <VacancyBreakdown
                  vacancies={payload.vacancies}
                  reservation={payload.reservation}
                />

                {payload.salaryDisclosed && (
                  <div className="inline-flex items-center gap-1 text-xs text-text-muted italic">
                    <IndianRupee size={12} /> {payload.salaryDisclosed}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 gap-4 flex-wrap">
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      days <= 7 ? 'text-danger' : 'text-text-muted'
                    }`}
                  >
                    <CalendarClock size={12} />
                    {payload.deadline
                      ? new Date(payload.deadline).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'No deadline set'}
                    {payload.deadline &&
                      ` · ${days > 0 ? `${days}d left` : 'closed'}`}
                  </div>
                  <button
                    disabled
                    className="rounded-md bg-primary text-white text-sm font-medium px-3 py-1.5 opacity-60 cursor-not-allowed"
                    title="Preview only"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </article>
          </div>

          <footer className="border-t border-border px-5 py-3 shrink-0 flex items-center justify-end bg-muted/30">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </footer>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
