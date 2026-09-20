import React, { useState } from 'react';
import { Briefcase, Save } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { createJob, updateJob } from '../../services/job.service';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];

const EMPTY = {
  title: '',
  department: '',
  designation: 'Assistant',
  qualifications: '',
  description: '',
  location: '',
  experienceYears: 0,
  salaryDisclosed: '',
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setSubmitting(true);
    const payload = {
      title: form.title.trim(),
      department: form.department.trim(),
      designation: form.designation,
      qualifications: form.qualifications.trim(),
      description: form.description.trim(),
      location: form.location.trim() || undefined,
      experienceYears: Number(form.experienceYears) || 0,
      salaryDisclosed: form.salaryDisclosed.trim() || undefined,
      deadline: form.deadline,
      domainTags: form.domainTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    };
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
    }
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
                Posted: <span className="font-semibold">{success.title}</span> — visible on the Job
                Board now.
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
              <Label htmlFor="salary">Salary (optional)</Label>
              <Input
                id="salary"
                value={form.salaryDisclosed}
                onChange={e => update('salaryDisclosed', e.target.value)}
                placeholder="AGP Rs. 1,01,500 (Level 12)"
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

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {isEdit ? (
            <>
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
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
              <Button type="submit" disabled={submitting}>
                <Briefcase size={14} className="mr-1.5" />
                {submitting ? 'Publishing…' : 'Publish job'}
              </Button>
            </>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
