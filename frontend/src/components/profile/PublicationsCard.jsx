import React, { useState } from 'react';
import { FileText, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import SourceBadge, { sourceLabel } from './SourceBadge';

function AddPublicationForm({ onSubmit, onCancel }) {
  const [mode, setMode] = useState('doi');
  const [doi, setDoi] = useState('');
  const [manual, setManual] = useState({ title: '', authors: '', year: '', venue: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (saving) return;
    setErr('');
    setSaving(true);
    try {
      if (mode === 'doi') {
        const cleaned = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
        if (!cleaned) {
          setErr('Enter a DOI');
          setSaving(false);
          return;
        }
        await onSubmit({ doi: cleaned });
      } else {
        if (!manual.title.trim()) {
          setErr('Title is required');
          setSaving(false);
          return;
        }
        const authors = manual.authors
          .split(/[,;\n]+/)
          .map(a => a.trim())
          .filter(Boolean);
        await onSubmit({
          title: manual.title.trim(),
          authors,
          year: manual.year ? Number(manual.year) : null,
          venue: manual.venue.trim() || undefined,
        });
      }
      onCancel();
    } catch (error) {
      setErr(error.response?.data?.error?.message || 'Could not add publication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-white/60 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setMode('doi')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              mode === 'doi' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-light'
            }`}
          >
            By DOI
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-3 py-1 text-xs font-semibold rounded ${
              mode === 'manual' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-light'
            }`}
          >
            Manual entry
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-text-muted hover:text-text-light hover:bg-muted"
        >
          <X size={14} />
        </button>
      </div>

      {mode === 'doi' ? (
        <div>
          <Label htmlFor="pub-doi">DOI</Label>
          <Input
            id="pub-doi"
            value={doi}
            onChange={e => setDoi(e.target.value)}
            placeholder="e.g. 10.1109/EXAMPLE.2024.12345"
            autoFocus
          />
          <p className="text-[11px] text-text-muted mt-1">
            We'll fetch title, authors, year, and venue from Crossref.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="pub-title">Title *</Label>
            <Input
              id="pub-title"
              value={manual.title}
              onChange={e => setManual(m => ({ ...m, title: e.target.value }))}
              autoFocus
              required
            />
          </div>
          <div>
            <Label htmlFor="pub-authors">Authors (comma-separated)</Label>
            <Input
              id="pub-authors"
              value={manual.authors}
              onChange={e => setManual(m => ({ ...m, authors: e.target.value }))}
              placeholder="A. Krishnan, R. Iyer, P. Menon"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pub-year">Year</Label>
              <Input
                id="pub-year"
                type="number"
                min="1900"
                max="2100"
                value={manual.year}
                onChange={e => setManual(m => ({ ...m, year: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="pub-venue">Venue</Label>
              <Input
                id="pub-venue"
                value={manual.venue}
                onChange={e => setManual(m => ({ ...m, venue: e.target.value }))}
                placeholder="Journal or conference name"
              />
            </div>
          </div>
        </div>
      )}

      {err && <div className="text-xs text-danger">{err}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Adding…' : 'Add publication'}
        </Button>
      </div>
    </form>
  );
}

export default function PublicationsCard({
  publications,
  orcidLinked,
  orcidId,
  onSyncOrcid,
  onEnrichCrossref,
  onImportCsv,
  onAddManual,
  onRemove,
  onError,
}) {
  const { toast } = useToast();
  const [syncingOrcid, setSyncingOrcid] = useState(false);
  const [enrichingCrossref, setEnrichingCrossref] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const doSyncOrcid = async () => {
    if (syncingOrcid) return;
    setSyncingOrcid(true);
    try {
      const s = await onSyncOrcid();
      toast({
        title: 'ORCID sync complete',
        description: `Fetched ${s.fetched} · added ${s.inserted} · updated ${s.updated}`,
      });
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not sync from ORCID.');
    } finally {
      setSyncingOrcid(false);
    }
  };

  const doEnrichCrossref = async () => {
    if (enrichingCrossref) return;
    setEnrichingCrossref(true);
    try {
      const s = await onEnrichCrossref();
      toast({
        title: 'Crossref enrichment complete',
        description: `Scanned ${s.scanned} · updated ${s.updated}`,
      });
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not enrich via Crossref.');
    } finally {
      setEnrichingCrossref(false);
    }
  };

  const doCsv = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || importingCsv) return;
    if (file.size > 1_000_000) {
      onError('CSV file exceeds 1 MB limit');
      return;
    }
    setImportingCsv(true);
    try {
      const text = await file.text();
      const s = await onImportCsv(text);
      toast({
        title: 'Scholar CSV imported',
        description: `${s.dataRows} row${s.dataRows === 1 ? '' : 's'} · added ${s.inserted} · updated ${s.updated}${s.skipped ? ` · skipped ${s.skipped}` : ''}`,
      });
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not import CSV.');
    } finally {
      setImportingCsv(false);
    }
  };

  const doAddManual = async payload => {
    const pub = await onAddManual(payload);
    toast({
      title: 'Publication added',
      description: pub?.title ? `"${pub.title.slice(0, 60)}${pub.title.length > 60 ? '…' : ''}" saved.` : undefined,
      variant: 'success',
    });
  };

  const doDelete = async pub => {
    if (deletingId) return;
    const label = pub.title.length > 80 ? `${pub.title.slice(0, 77)}…` : pub.title;
    const ok = window.confirm(`Remove this publication from your profile?\n\n${label}`);
    if (!ok) return;
    setDeletingId(pub.id);
    try {
      await onRemove(pub.id);
      toast({ title: 'Publication removed', variant: 'info' });
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not remove publication');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Publications
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} className="mr-1" /> Add publication
            </Button>
            {orcidLinked && (
              <Button size="sm" variant="outline" onClick={doSyncOrcid} disabled={syncingOrcid}>
                {syncingOrcid ? 'Syncing…' : 'Sync from ORCID'}
              </Button>
            )}
            {publications.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={doEnrichCrossref}
                disabled={enrichingCrossref}
              >
                {enrichingCrossref ? 'Enriching…' : 'Enrich via Crossref'}
              </Button>
            )}
            <label className="inline-block">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={doCsv}
                disabled={importingCsv}
                className="sr-only"
              />
              <span
                className={`inline-flex items-center justify-center rounded-md border border-border bg-white text-text-light h-9 px-3 text-sm font-medium cursor-pointer hover:bg-muted ${
                  importingCsv ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {importingCsv ? 'Importing…' : 'Import Scholar CSV'}
              </span>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <AddPublicationForm onSubmit={doAddManual} onCancel={() => setShowAdd(false)} />
        )}

        {!orcidLinked && publications.length === 0 && !showAdd ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="No publications yet"
            description="Connect ORCID to import automatically, upload a Google Scholar CSV, or add works one at a time via DOI or manual entry."
            action={
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus size={14} className="mr-1" /> Add your first publication
              </Button>
            }
          />
        ) : publications.length === 0 && !showAdd ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="No publications yet"
            description={
              <>
                Click "Sync from ORCID" to import — or add works to your ORCID record first at{' '}
                <a
                  className="text-primary underline"
                  href={`https://sandbox.orcid.org/${orcidId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  sandbox.orcid.org/{orcidId}
                </a>
                .
              </>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {publications.map(pub => (
              <div key={pub.id} className="py-4 flex items-start gap-3 group">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-light">{pub.title}</div>
                  {pub.authors?.length > 0 && (
                    <div className="text-sm text-text-muted mt-1">
                      {pub.authors.slice(0, 6).join(', ')}
                      {pub.authors.length > 6 ? ` +${pub.authors.length - 6} more` : ''}
                    </div>
                  )}
                  <div className="text-sm text-text-muted mt-1">
                    {pub.venue ? <span className="italic">{pub.venue}</span> : null}
                    {pub.venue && pub.year ? ' · ' : ''}
                    {pub.year || ''}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <SourceBadge source={sourceLabel(pub.source)} />
                    {typeof pub.citationCount === 'number' && pub.citationCount > 0 && (
                      <span className="text-xs text-text-muted">
                        Cited by <span className="font-semibold text-text-light">{pub.citationCount}</span>
                      </span>
                    )}
                    {pub.doi && (
                      <a
                        href={`https://doi.org/${pub.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        DOI {pub.doi}
                      </a>
                    )}
                  </div>
                </div>
                {pub.source === 'manual' && (
                  <button
                    type="button"
                    onClick={() => doDelete(pub)}
                    disabled={deletingId === pub.id}
                    className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40 shrink-0"
                    aria-label="Remove publication"
                    title="Remove this manually-added publication"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
