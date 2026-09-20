import React, { useState } from 'react';
import { Handshake, Save, X, Check } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { OPEN_TO_META, OPEN_TO_ORDER } from '../../lib/openTo';

/**
 * Declared-intent card on the faculty profile. Faculty tick which of
 * the four collaboration invitations they're open to; the Directory
 * then becomes searchable by intent as well as by domain.
 *
 * Persisted via updateFaculty (openTo array). Saves atomically so a
 * partial checkbox click never leaves the DB half-updated.
 */
export default function OpenToCard({ openTo = [], onSave, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(openTo);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(openTo || []);
    setEditing(true);
  };

  const toggle = key => {
    setDraft(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const cancel = () => {
    setDraft(openTo || []);
    setEditing(false);
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Could not save your open-to preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Handshake size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text-light">Open to</div>
              <p className="text-sm text-text-muted mt-0.5 max-w-xl">
                Declare what collaboration invitations you welcome — peers will find you in
                Directory searches filtered by intent.
              </p>
            </div>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              Edit
            </Button>
          )}
        </div>

        {!editing && (
          <div className="flex flex-wrap gap-2">
            {(openTo?.length ? openTo : []).map(key => {
              const meta = OPEN_TO_META[key];
              if (!meta) return null;
              return (
                <span
                  key={key}
                  title={meta.hint}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-3 py-1 text-xs font-semibold"
                >
                  <Check size={12} /> {meta.short}
                </span>
              );
            })}
            {!openTo?.length && (
              <span className="text-xs text-text-muted italic">
                You haven't declared any intents yet. Click Edit to add.
              </span>
            )}
          </div>
        )}

        {editing && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {OPEN_TO_ORDER.map(key => {
                const meta = OPEN_TO_META[key];
                const checked = draft.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-white hover:border-primary/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(key)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-light">{meta.long}</div>
                      <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                        {meta.hint}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                <X size={13} className="mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={saving}>
                <Save size={13} className="mr-1" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
