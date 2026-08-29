import React, { useState } from 'react';
import { GraduationCap, Globe, Award, Newspaper, Megaphone } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { createOpportunity } from '../../services/opportunity.service';

const TYPE_OPTIONS = [
  { value: 'fdp', label: 'Faculty Development Programme', icon: GraduationCap, hint: 'AICTE-ATAL, ARPIT, institutional FDPs' },
  { value: 'conference', label: 'Conference / Workshop', icon: Globe, hint: 'IEEE, ACM, Springer, or institutional' },
  { value: 'grant', label: 'Grant / Fellowship', icon: Award, hint: 'DST, DBT, SERB, ICSSR, ICMR, UGC' },
  { value: 'journal', label: 'Journal (Call for Papers)', icon: Newspaper, hint: 'UGC-CARE listed or Scopus indexed only' },
];

const MODE_OPTIONS = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
];

const EMPTY = {
  type: 'fdp',
  title: '',
  description: '',
  domainTags: '',
  mode: 'offline',
  location: '',
  cost: 0,
  deadline: '',
  url: '',
  issn: '',
};

export default function PostOpportunityForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const isJournal = form.type === 'journal';

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    const payload = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      domainTags: form.domainTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
      mode: form.mode,
      location: form.location.trim() || undefined,
      cost: Number(form.cost) || 0,
      deadline: form.deadline,
      url: form.url.trim() || undefined,
      issn: isJournal ? form.issn.trim() || undefined : undefined,
    };
    setSubmitting(true);
    try {
      const result = await createOpportunity(payload);
      setSuccess(result);
      setForm(EMPTY);
      onCreated?.(result.opportunity);
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || 'Could not publish opportunity');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard
      title="Post an opportunity"
      subtitle="FDPs, conferences, grants, or journal calls. Faculty see verified listings on the Discover feed."
    >
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success">
            <AlertDescription>
              {success.status === 'live' ? (
                <>
                  Published:{' '}
                  <span className="font-semibold">{success.opportunity.title}</span> — visible on
                  the Discover feed now.
                </>
              ) : (
                <>
                  Submitted for review: <span className="font-semibold">{success.opportunity.title}</span>.
                  It'll go live after Platform Admin verifies your institution.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label className="mb-2 block">Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = form.type === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => update('type', opt.value)}
                  className={`text-left rounded-lg border px-3 py-2.5 flex items-start gap-3 transition-all ${
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                      active ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-text-light">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-text-muted mt-0.5">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              minLength={6}
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="AICTE-ATAL FDP: Foundations of Generative AI for Engineering Faculty"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              required
              rows={5}
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Give faculty enough context to decide. Learning outcomes, target audience, prerequisites, deliverables."
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="text-[11px] text-text-muted">
              {form.description.length}/4000 · at least 30 characters
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <select
              id="mode"
              value={form.mode}
              onChange={e => update('mode', e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
              placeholder={form.mode === 'online' ? 'Optional' : 'Chennai, Tamil Nadu'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost (INR)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              value={form.cost}
              onChange={e => update('cost', e.target.value)}
              placeholder="0 for free"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Registration / Submission deadline</Label>
            <Input
              id="deadline"
              type="date"
              required
              value={form.deadline}
              onChange={e => update('deadline', e.target.value)}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="url">Organizer page URL</Label>
            <Input
              id="url"
              type="url"
              value={form.url}
              onChange={e => update('url', e.target.value)}
              placeholder="https://your-institution.ac.in/fdp-generative-ai"
            />
          </div>

          {isJournal && (
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="issn">ISSN (required for journals)</Label>
              <Input
                id="issn"
                value={form.issn}
                onChange={e => update('issn', e.target.value)}
                placeholder="1234-5678"
              />
              <div className="text-[11px] text-text-muted">
                Format: 4 digits, hyphen, 3 digits, then a digit or X. Journals go through UGC-CARE
                verification before receiving the badge.
              </div>
            </div>
          )}

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="tags">Research domain tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.domainTags}
              onChange={e => update('domainTags', e.target.value)}
              placeholder="Machine Learning, Generative AI, Educational Technology"
            />
            <div className="text-[11px] text-text-muted">
              Tags drive discovery — faculty match on these against their profile.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setForm(EMPTY)}
            disabled={submitting}
          >
            Reset
          </Button>
          <Button type="submit" disabled={submitting}>
            <Megaphone size={14} className="mr-1.5" />
            {submitting ? 'Publishing…' : 'Publish opportunity'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
