import React, { useState } from 'react';
import { GraduationCap, ExternalLink, Save, X } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const VIDWAN_PROFILE_BASE = 'https://vidwan.inflibnet.ac.in/profile';

/**
 * Vidwan (INFLIBNET) integration card. Vidwan hosts India's Expert
 * Database; INFLIBNET doesn't expose a public REST API, so this card
 * gives faculty a way to LINK their Vidwan profile (for discoverability
 * and reciprocal citations) rather than auto-import from it. The manual
 * publication add flow accepts a "Vidwan" source tag so pubs lifted
 * from a Vidwan profile can be added with honest provenance.
 */
export default function VidwanCard({ vidwanId, onSave, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(vidwanId || '');
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(vidwanId || '');
    setEditing(true);
  };

  const cancel = () => {
    setDraft(vidwanId || '');
    setEditing(false);
  };

  const save = async () => {
    if (saving) return;
    const cleaned = draft.trim();
    if (cleaned && !/^\d+$/.test(cleaned)) {
      onError?.('Vidwan ID must be numeric — copy just the number from your profile URL.');
      return;
    }
    setSaving(true);
    try {
      await onSave(cleaned);
      setEditing(false);
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Could not save Vidwan ID');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text-light">
                Vidwan (INFLIBNET) integration
              </div>
              <p className="text-sm text-text-muted mt-0.5 max-w-xl">
                Link your Vidwan Expert Database profile so peers can find you across
                India's academic directory ecosystem.
              </p>
            </div>
          </div>
          {!editing && vidwanId && (
            <Button size="sm" variant="outline" onClick={start}>
              Change
            </Button>
          )}
        </div>

        {!editing && vidwanId && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-success/10 text-success border border-success/30 px-3 py-1.5 text-sm font-semibold">
              Vidwan ID {vidwanId}
            </span>
            <a
              href={`${VIDWAN_PROFILE_BASE}/${vidwanId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              View my Vidwan profile <ExternalLink size={13} />
            </a>
          </div>
        )}

        {!editing && !vidwanId && (
          <div className="mt-4">
            <Button size="sm" variant="outline" onClick={start}>
              Link Vidwan ID
            </Button>
          </div>
        )}

        {editing && (
          <div className="mt-4 space-y-3">
            <div>
              <Input
                type="text"
                placeholder="e.g. 123456"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-text-muted mt-1">
                Find your ID in your Vidwan profile URL:{' '}
                <span className="font-mono">
                  vidwan.inflibnet.ac.in/profile/<span className="text-primary">123456</span>
                </span>
                . Leave blank and save to unlink.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
                <X size={13} className="mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save size={13} className="mr-1" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Honest disclosure about the integration ceiling. INFLIBNET
            doesn't publish an API, so we can't auto-pull publications
            the way we do for ORCID / Scopus. Users can still add pubs
            from Vidwan manually and tag them with the Vidwan source. */}
        <div className="mt-4 text-[11px] text-text-muted leading-relaxed">
          INFLIBNET doesn't publish a public API for Vidwan, so publications aren't pulled
          automatically. To import your Vidwan publications: click{' '}
          <span className="font-semibold">Add publication</span> below → choose{' '}
          <span className="font-semibold">Manual entry</span> → select{' '}
          <span className="font-semibold">Copied from my Vidwan profile</span> as the
          source. Entries stay tagged with Vidwan provenance.
        </div>
      </CardContent>
    </Card>
  );
}
