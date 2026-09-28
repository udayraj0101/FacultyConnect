import React, { useState } from 'react';
import { Briefcase, Save, ChevronDown, ChevronUp, FileText, Eye } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { createJob, updateJob } from '../../services/job.service';
import JobPreviewModal from './JobPreviewModal';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];

// UR/SC/ST/OBC/EWS are vertical categories (sum must equal total
// vacancies). PwD is horizontal — it carves seats OUT of the vertical
// buckets, so it caps at total vacancies but doesn't add to the sum.
const RESERVATION_CATEGORIES = ['UR', 'SC', 'ST', 'OBC', 'EWS'];
const EMPTY_RESERVATION = { UR: 0, SC: 0, ST: 0, OBC: 0, EWS: 0, PwD: 0 };

// 7th CPC Academic Pay Levels — mirrored in backend/models/Job.js.
// Ranges are the current 7th CPC pay band (basic pay in ₹, not
// including HRA/DA). Displayed in the dropdown so admins picking a
// level see the pay band their institution is committing to.
const PAY_LEVELS = [
  { value: 'L10', label: 'Level 10 — Assistant Professor (Entry)', range: '₹57,700 – 1,82,400' },
  { value: 'L11', label: 'Level 11 — Assistant Professor (Senior Grade)', range: '₹68,900 – 2,05,500' },
  { value: 'L12', label: 'Level 12 — Assistant Professor (Senior Scale)', range: '₹79,800 – 2,11,500' },
  { value: 'L13A', label: 'Level 13A — Associate Professor', range: '₹1,31,400 – 2,17,100' },
  { value: 'L14', label: 'Level 14 — Professor', range: '₹1,44,200 – 2,18,200' },
  { value: 'L15', label: 'Level 15 — Senior Professor / HAG', range: '₹1,82,200 – 2,24,100' },
];

const EMPTY = {
  title: '',
  department: '',
  designation: 'Assistant',
  qualifications: '',
  description: '',
  location: '',
  experienceYears: 0,
  salaryDisclosed: '',
  payLevel: '',
  vacancies: 1,
  reservation: { ...EMPTY_RESERVATION },
  deadline: '',
  domainTags: '',
};

// Serialise a Date-ish value for the date input (needs YYYY-MM-DD).
function toDateInputValue(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

// Populate the form state from an existing Job object (used in edit mode).
// Deadline needs date-only serialisation; domainTags flattens to a
// comma-separated string.
function jobToFormState(job) {
  if (!job) return EMPTY;
  return {
    title: job.title || '',
    department: job.department || '',
    designation: job.designation || 'Assistant',
    qualifications: job.qualifications || '',
    description: job.description || '',
    location: job.location || '',
    experienceYears: job.experienceYears ?? 0,
    salaryDisclosed: job.salaryDisclosed || '',
    payLevel: job.payLevel || '',
    vacancies: job.vacancies ?? 1,
    reservation: {
      UR: job.reservation?.UR ?? 0,
      SC: job.reservation?.SC ?? 0,
      ST: job.reservation?.ST ?? 0,
      OBC: job.reservation?.OBC ?? 0,
      EWS: job.reservation?.EWS ?? 0,
      PwD: job.reservation?.PwD ?? 0,
    },
    deadline: toDateInputValue(job.deadline),
    domainTags: Array.isArray(job.domainTags) ? job.domainTags.join(', ') : '',
  };
}

/**
 * PostJobForm doubles as the edit form. When `editJob` is set, we
 * initialise from that job, call PATCH /jobs/:id on submit, and expose
 * a Cancel button. Otherwise it renders as the standard create form.
 */
export default function PostJobForm({ onCreated, editJob, onSaved, onCancel }) {
  const isEdit = Boolean(editJob);
  const [form, setForm] = useState(() => (isEdit ? jobToFormState(editJob) : EMPTY));
  const [submitting, setSubmitting] = useState(false);
  const [submittingIntent, setSubmittingIntent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // In edit mode, we snapshot the source status so "Save changes" keeps
  // the posting in its current state. Publish + Save-as-draft buttons
  // still work as explicit overrides.
  const sourceStatus = isEdit ? editJob?.status || 'open' : 'draft';
  // Reservation block is collapsed by default — most postings don't need
  // it, and it takes ~120px of vertical space when open. Auto-expand on
  // edit if the posting has any reservation set (so the admin sees it).
  const [showReservation, setShowReservation] = useState(() => {
    if (!isEdit) return false;
    const r = editJob?.reservation;
    if (!r) return false;
    return r.UR || r.SC || r.ST || r.OBC || r.EWS || r.PwD;
  });

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const updateReservation = (cat, v) =>
    setForm(prev => ({
      ...prev,
      reservation: { ...prev.reservation, [cat]: Math.max(0, Number(v) || 0) },
    }));

  const verticalSum =
    form.reservation.UR +
    form.reservation.SC +
    form.reservation.ST +
    form.reservation.OBC +
    form.reservation.EWS;
  const anyVerticalSet = verticalSum > 0;
  const vacancies = Number(form.vacancies) || 0;
  const verticalMismatch = anyVerticalSet && verticalSum !== vacancies;
  const pwdOverflow = form.reservation.PwD > vacancies;

  // Serialise the current form state into the API payload. Extracted
  // so the preview modal can consume it without duplicating the
  // trim/number-coerce logic in two places.
  const buildPayload = intent => ({
    title: form.title.trim(),
    department: form.department.trim(),
    designation: form.designation,
    qualifications: form.qualifications.trim(),
    description: form.description.trim(),
    location: form.location.trim() || undefined,
    experienceYears: Number(form.experienceYears) || 0,
    salaryDisclosed: form.salaryDisclosed.trim() || undefined,
    payLevel: form.payLevel || undefined,
    vacancies: Number(form.vacancies) || 1,
    reservation: {
      UR: Number(form.reservation.UR) || 0,
      SC: Number(form.reservation.SC) || 0,
      ST: Number(form.reservation.ST) || 0,
      OBC: Number(form.reservation.OBC) || 0,
      EWS: Number(form.reservation.EWS) || 0,
      PwD: Number(form.reservation.PwD) || 0,
    },
    deadline: form.deadline,
    domainTags: form.domainTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    // create allows status; edit ignores it (PATCH schema is strict
    // and status has its own /status route). We only send it on create.
    ...(intent && !isEdit ? { status: intent } : {}),
  });

  const doSubmit = async intent => {
    setError('');
    setSuccess(null);
    setSubmitting(true);
    setSubmittingIntent(intent);
    const payload = buildPayload(intent);
    try {
      if (isEdit) {
        const updated = await updateJob(editJob.id, payload);
        setSuccess(updated);
        onSaved?.(updated);
      } else {
        const job = await createJob(payload);
        setSuccess(job);
        setForm(EMPTY);
        onCreated?.(job);
      }
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || (isEdit ? 'Could not save changes' : 'Could not create job'));
      }
    } finally {
      setSubmitting(false);
      setSubmittingIntent('');
    }
  };

  // Form onSubmit fires on Enter-in-field; treat that as "publish"
  // in create mode and "save" in edit mode to keep the muscle memory.
  const onSubmit = e => {
    e.preventDefault();
    doSubmit(isEdit ? sourceStatus : 'open');
  };

  return (
    <SectionCard
      title={isEdit ? `Edit posting — ${editJob.title}` : 'Post a new opening'}
      subtitle={
        isEdit
          ? 'Update fields and save. Applicants stay attached.'
          : 'Faculty see this in the Job Board and can apply with one click'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              <AlertDescription>
                {success.status === 'draft' ? (
                  <>
                    Draft saved: <span className="font-semibold">{success.title}</span> — visible
                    in My Jobs but not yet on the public Job Board.
                  </>
                ) : (
                  <>
                    Posted: <span className="font-semibold">{success.title}</span> — visible on
                    the Job Board now.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="Assistant Professor — Computer Science (Applied ML)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                required
                value={form.department}
                onChange={e => update('department', e.target.value)}
                placeholder="Computer Science & Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <select
                id="designation"
                value={form.designation}
                onChange={e => update('designation', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {DESIGNATIONS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={e => update('location', e.target.value)}
                placeholder="Chennai, Tamil Nadu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experienceYears">Minimum experience (years)</Label>
              <Input
                id="experienceYears"
                type="number"
                min="0"
                max="60"
                value={form.experienceYears}
                onChange={e => update('experienceYears', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacancies">Number of vacancies</Label>
              <Input
                id="vacancies"
                type="number"
                min="1"
                max="500"
                required
                value={form.vacancies}
                onChange={e => update('vacancies', e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <button
                type="button"
                onClick={() => setShowReservation(v => !v)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-primary transition-colors"
              >
                {showReservation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Reservation category breakup
                <span className="text-xs text-text-muted font-normal">
                  (optional — required for government institutions)
                </span>
              </button>
              {showReservation && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="text-xs text-text-muted leading-relaxed">
                    Enter per-category vacancy counts. UR + SC + ST + OBC + EWS must equal the
                    total vacancies. PwD is horizontal — reserved seats carved out of the
                    categories above (does not add to the total).
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {RESERVATION_CATEGORIES.map(cat => (
                      <div key={cat} className="space-y-1">
                        <Label htmlFor={`res-${cat}`} className="text-xs">
                          {cat}
                        </Label>
                        <Input
                          id={`res-${cat}`}
                          type="number"
                          min="0"
                          max="500"
                          value={form.reservation[cat]}
                          onChange={e => updateReservation(cat, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="space-y-1">
                      <Label htmlFor="res-PwD" className="text-xs">
                        PwD
                      </Label>
                      <Input
                        id="res-PwD"
                        type="number"
                        min="0"
                        max="500"
                        value={form.reservation.PwD}
                        onChange={e => updateReservation('PwD', e.target.value)}
                        className={pwdOverflow ? 'border-danger' : ''}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">
                      Vertical total: <span className="font-semibold tabular-nums">{verticalSum}</span> of{' '}
                      <span className="font-semibold tabular-nums">{vacancies}</span>
                    </span>
                    {verticalMismatch && (
                      <span className="text-danger font-medium">
                        Sum must equal {vacancies}.
                      </span>
                    )}
                    {pwdOverflow && (
                      <span className="text-danger font-medium">
                        PwD cannot exceed {vacancies}.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="qualifications">Qualifications required</Label>
              <textarea
                id="qualifications"
                required
                rows={3}
                value={form.qualifications}
                onChange={e => update('qualifications', e.target.value)}
                placeholder="PhD in Computer Science, strong publication record in ML, teaching aptitude"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Job description</Label>
              <textarea
                id="description"
                required
                rows={5}
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Tenure-track position with responsibilities in teaching, research, and departmental service..."
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Application deadline</Label>
              <Input
                id="deadline"
                type="date"
                required
                value={form.deadline}
                onChange={e => update('deadline', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payLevel">7th CPC pay level (optional)</Label>
              <select
                id="payLevel"
                value={form.payLevel}
                onChange={e => update('payLevel', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Not disclosed / Private-institution scale</option>
                {PAY_LEVELS.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              {form.payLevel && (
                <div className="text-[11px] text-text-muted">
                  Basic pay: {PAY_LEVELS.find(p => p.value === form.payLevel)?.range}
                  <span className="italic"> (excl. HRA / DA)</span>
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="salary">Salary — additional notes (optional)</Label>
              <Input
                id="salary"
                value={form.salaryDisclosed}
                onChange={e => update('salaryDisclosed', e.target.value)}
                placeholder={
                  form.payLevel
                    ? 'e.g. Starting basic ₹1,44,200 · Consolidated ₹2.5L monthly'
                    : 'e.g. AGP Rs. 1,01,500 (Level 12) — for non-CPC institutions'
                }
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="tags">Research domain tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.domainTags}
                onChange={e => update('domainTags', e.target.value)}
                placeholder="Machine Learning, NLP, Systems"
              />
            </div>
          </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={submitting || !form.title.trim()}
            className="text-xs"
            title={!form.title.trim() ? 'Fill in a title first' : 'See how faculty will view this posting'}
          >
            <Eye size={13} className="mr-1.5" /> Preview
          </Button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isEdit ? (
              <>
                <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => doSubmit(sourceStatus)}
                  disabled={submitting || verticalMismatch || pwdOverflow}
                >
                  <Save size={14} className="mr-1.5" />
                  {submitting ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(EMPTY)}
                  disabled={submitting}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => doSubmit('draft')}
                  disabled={submitting || verticalMismatch || pwdOverflow}
                >
                  <FileText size={13} className="mr-1.5" />
                  {submitting && submittingIntent === 'draft' ? 'Saving…' : 'Save as draft'}
                </Button>
                <Button
                  type="button"
                  onClick={() => doSubmit('open')}
                  disabled={submitting || verticalMismatch || pwdOverflow}
                >
                  <Briefcase size={14} className="mr-1.5" />
                  {submitting && submittingIntent === 'open' ? 'Publishing…' : 'Publish job'}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>

      {previewOpen && (
        <JobPreviewModal
          payload={buildPayload(isEdit ? sourceStatus : 'open')}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </SectionCard>
  );
}
