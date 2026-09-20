import React, { useEffect, useState } from 'react';
import {
  Calculator,
  Save,
  X,
  Trophy,
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileDown,
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getCasScore, updateCasManualInputs } from '../../services/cas.service';
import { downloadCv } from '../../services/faculty.service';

// Metadata for the manual counters. Order matches how CAS applicants
// typically fill out the official form so the UI reads left-to-right
// through the same mental checklist.
const MANUAL_FIELDS = [
  {
    section: 'Research guidance',
    fields: [
      { key: 'phdAwarded', label: 'PhD students — awarded', hint: '10 pts / student' },
      { key: 'phdOngoing', label: 'PhD students — ongoing', hint: '5 pts / student' },
      { key: 'mPhilAwarded', label: 'M.Phil students — awarded', hint: '2 pts / student' },
    ],
  },
  {
    section: 'Books & chapters',
    fields: [
      { key: 'booksInternational', label: 'Books — International publisher', hint: '12 pts each' },
      { key: 'booksNational', label: 'Books — National publisher', hint: '10 pts each' },
      { key: 'chaptersInternational', label: 'Chapters — International', hint: '5 pts each' },
      { key: 'chaptersNational', label: 'Chapters — National', hint: '3 pts each' },
      { key: 'editorInternational', label: 'Editor — International', hint: '10 pts each' },
      { key: 'editorNational', label: 'Editor — National', hint: '5 pts each' },
    ],
  },
  {
    section: 'Invited lectures',
    fields: [
      { key: 'invitedLecturesIntlAbroad', label: 'International (abroad)', hint: '7 pts each' },
      { key: 'invitedLecturesIntlInIndia', label: 'International (in India)', hint: '5 pts each' },
      { key: 'invitedLecturesNational', label: 'National', hint: '3 pts each' },
      { key: 'invitedLecturesState', label: 'State / University', hint: '2 pts each' },
    ],
  },
  {
    section: 'Consultancy',
    fields: [
      {
        key: 'consultancyLakhs',
        label: 'Consultancy earnings (Rs. lakh)',
        hint: '3 pts per Rs. 10 lakh',
        step: '0.5',
      },
    ],
  },
];

// Human-friendly category headings for the auto breakdown. Keys match the
// `category` field emitted by the backend service.
const CATEGORY_LABELS = {
  papers: 'Research papers',
  publications: 'Books, chapters & editorship',
  projects: 'Sponsored projects & consultancy',
  guidance: 'Research guidance',
  awards: 'Awards & fellowships',
  lectures: 'Invited lectures',
};

const CATEGORY_ORDER = ['papers', 'publications', 'projects', 'guidance', 'awards', 'lectures'];

function EligibilityPill({ ok, label }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 px-3 py-1 text-xs font-semibold">
        <Trophy size={12} /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted text-text-muted border border-border px-3 py-1 text-xs font-semibold">
      <Target size={12} /> {label}
    </span>
  );
}

/**
 * UGC 2018 CAS Research Score calculator. Fetches the auto-computed
 * baseline from stored profile data on mount, then lets the faculty
 * fill in the counters we don't capture elsewhere (PhD supervision,
 * books, invited lectures, consultancy) with per-field save.
 */
export default function CasScoreCard({ onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getCasScore();
        if (!cancelled) {
          setData(result);
          setDraft(result.manualInputs || {});
        }
      } catch (err) {
        if (!cancelled) {
          onError?.(err.response?.data?.error?.message || 'Could not compute CAS score');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setDraft(data.manualInputs || {});
    setEditing(true);
  };

  const cancel = () => {
    setDraft(data.manualInputs || {});
    setEditing(false);
  };

  // Shared download handler for all three promotion-format CVs. Tracks
  // which template is in-flight so only its button shows the spinner.
  const handleDownload = async template => {
    if (downloading) return;
    setDownloading(template);
    try {
      await downloadCv(template);
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Could not download CV');
    } finally {
      setDownloading(null);
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const patch = {};
      for (const section of MANUAL_FIELDS) {
        for (const f of section.fields) {
          const next = Number(draft[f.key] || 0);
          const prev = Number(data.manualInputs?.[f.key] || 0);
          if (next !== prev) patch[f.key] = next;
        }
      }
      // Nothing changed — just close the editor without a round-trip.
      if (Object.keys(patch).length === 0) {
        setEditing(false);
        return;
      }
      const result = await updateCasManualInputs(patch);
      setData(result);
      setDraft(result.manualInputs || {});
      setEditing(false);
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Could not save CAS inputs');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div className="text-sm text-text-muted">Computing your CAS Research Score…</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { total, breakdown, categoryTotals, eligibility, thresholds, advisory } = data;

  const orderedCategories = CATEGORY_ORDER.filter(k => breakdown.some(l => l.category === k));

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text-light">UGC 2018 CAS Research Score</div>
              <p className="text-sm text-text-muted mt-0.5 max-w-xl">
                Live estimate of your Research Score under the UGC Regulations 2018
                Appendix II Table 2. Use this to gauge readiness for Assistant→Associate
                (≥75) or Associate→Professor (≥120) promotions.
              </p>
            </div>
          </div>
          {!editing && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload('ugc_cas9')}
                disabled={Boolean(downloading)}
                title="UGC Regulations 2018 CAS promotion proforma (Form 9)"
              >
                <FileDown size={13} className="mr-1" />
                {downloading === 'ugc_cas9' ? 'Generating…' : 'CAS-9 PDF'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload('aicte')}
                disabled={Boolean(downloading)}
                title="AICTE Approval Process faculty self-disclosure proforma"
              >
                <FileDown size={13} className="mr-1" />
                {downloading === 'aicte' ? 'Generating…' : 'AICTE PDF'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload('nirf')}
                disabled={Boolean(downloading)}
                title="NIRF per-faculty data card — reconciliation aid for the institution's submission"
              >
                <FileDown size={13} className="mr-1" />
                {downloading === 'nirf' ? 'Generating…' : 'NIRF PDF'}
              </Button>
              <Button size="sm" variant="outline" onClick={startEdit}>
                Edit inputs
              </Button>
            </div>
          )}
        </div>

        {/* Total + eligibility strip */}
        <div className="rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
              Total research score
            </div>
            <div className="text-4xl font-bold text-secondary mt-1 leading-none">
              {total}
              <span className="text-lg text-text-muted font-medium ml-2">pts</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <EligibilityPill
                ok={eligibility.qualifiesForAssociate}
                label={
                  eligibility.qualifiesForAssociate
                    ? `Qualifies for Associate (≥${thresholds.associate})`
                    : `${eligibility.pointsToAssociate} more for Associate`
                }
              />
              <EligibilityPill
                ok={eligibility.qualifiesForProfessor}
                label={
                  eligibility.qualifiesForProfessor
                    ? `Qualifies for Professor (≥${thresholds.professor})`
                    : `${eligibility.pointsToProfessor} more for Professor`
                }
              />
            </div>
          </div>
        </div>

        {/* Auto breakdown — collapsible so the card stays quiet by default */}
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setBreakdownOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-text-light hover:bg-muted/40"
          >
            <span>Show breakdown by category</span>
            {breakdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {breakdownOpen && (
            <div className="border-t border-border divide-y divide-border">
              {orderedCategories.map(cat => {
                const lines = breakdown.filter(l => l.category === cat);
                const catTotal = categoryTotals[cat] || 0;
                return (
                  <div key={cat} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        {CATEGORY_LABELS[cat] || cat}
                      </div>
                      <div className="text-sm font-bold text-secondary tabular-nums">
                        {catTotal} pts
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {lines.map((line, idx) => (
                        <li key={idx} className="flex items-baseline gap-3">
                          <span className="flex-1 text-text-light">{line.label}</span>
                          <span className="text-text-muted tabular-nums text-xs">
                            {line.count}
                            {line.countUnit ? ` ${line.countUnit}` : ''} × {line.perPoint} =
                          </span>
                          <span className="font-semibold text-text-light tabular-nums w-14 text-right">
                            {line.points}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {lines.some(l => l.note) && (
                      <div className="mt-2 text-[11px] text-text-muted italic">
                        {lines.find(l => l.note)?.note}
                      </div>
                    )}
                  </div>
                );
              })}
              {orderedCategories.length === 0 && (
                <div className="px-4 py-4 text-sm text-text-muted italic">
                  No scoreable entries yet. Add publications, grants, or fill in the manual
                  counters below.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual input editor. Sections match Table 2 groupings */}
        {editing && (
          <div className="space-y-4">
            {MANUAL_FIELDS.map(section => (
              <div key={section.section}>
                <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                  {section.section}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {section.fields.map(f => (
                    <label key={f.key} className="block">
                      <div className="text-xs text-text-light font-medium mb-1">
                        {f.label}
                        <span className="text-text-muted font-normal"> · {f.hint}</span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step={f.step || '1'}
                        value={draft[f.key] ?? 0}
                        onChange={e =>
                          setDraft(prev => ({ ...prev, [f.key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                <X size={13} className="mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save size={13} className="mr-1" />
                {saving ? 'Saving…' : 'Save & recompute'}
              </Button>
            </div>
          </div>
        )}

        {/* Advisory footnote — spec-critical: promotion committee applies
            rules we can't automate, so we never claim this is authoritative. */}
        <div className="flex items-start gap-2 rounded-md bg-muted/40 border border-border px-3 py-2 text-[11px] text-text-muted leading-relaxed">
          <AlertCircle size={13} className="text-text-muted mt-0.5 shrink-0" />
          <span>{advisory}</span>
        </div>
      </CardContent>
    </Card>
  );
}
