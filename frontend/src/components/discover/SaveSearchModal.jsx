import React, { useState } from 'react';
import { X, Bell, BellOff, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { createSavedSearch } from '../../services/savedSearch.service';

/**
 * Save-current-filters modal. Auto-composes a default name from the
 * active filters so the common path is one click. `defaultName` and
 * `type` come from DiscoverShell; `filters` is the exact filter blob
 * (minus type/page/limit which the backend re-adds when the search
 * runs).
 */
export default function SaveSearchModal({
  open,
  defaultName,
  type,
  typeLabel,
  filters,
  onClose,
  onSaved,
}) {
  const [name, setName] = useState(defaultName || '');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset local state whenever the modal opens for a new save.
  React.useEffect(() => {
    if (open) {
      setName(defaultName || '');
      setAlertsEnabled(true);
      setError('');
      setSaving(false);
    }
  }, [open, defaultName]);

  if (!open) return null;

  const submit = async e => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError('Give this search a name so you can find it later.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await createSavedSearch({
        name: name.trim(),
        type,
        filters,
        alertsEnabled,
      });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save the search');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-search-title"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 pb-3 border-b border-border">
          <div>
            <h2 id="save-search-title" className="text-base font-bold text-secondary">
              Save this search
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Reopen it anytime and get alerts when new{' '}
              {typeLabel?.toLowerCase() || 'opportunities'} match.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-text-muted hover:bg-muted hover:text-text-light"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="ss-name" className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Name
            </Label>
            <Input
              id="ss-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. ML journals with Q1 indexing"
              maxLength={100}
              autoFocus
            />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/50 cursor-pointer">
            <input
              type="checkbox"
              checked={alertsEnabled}
              onChange={e => setAlertsEnabled(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <div className="text-xs">
              <div className="font-semibold text-text-light inline-flex items-center gap-1.5">
                {alertsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                Email + in-app alerts for new matches
              </div>
              <p className="text-text-muted mt-0.5 leading-relaxed">
                A nightly job checks for {typeLabel?.toLowerCase() || 'opportunities'} that
                match these filters. You'll get notified only when something new appears.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              <Save size={13} className="mr-1.5" />
              {saving ? 'Saving…' : 'Save search'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
