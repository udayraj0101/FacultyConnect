import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

export default function ScopusEnrichmentCard({ initialScopusId = '', onSync, onError }) {
  const { toast } = useToast();
  const [value, setValue] = useState(initialScopusId);
  const [syncing, setSyncing] = useState(false);

  const submit = async () => {
    if (syncing) return;
    const id = value.trim();
    if (!id) {
      onError('Enter your Scopus Author ID first.');
      return;
    }
    setSyncing(true);
    try {
      const s = await onSync(id);
      toast({
        title: 'Scopus sync complete',
        description: `${s.publicationsUpdated} of ${s.publicationsScanned} publications updated · h-index ${s.faculty?.hIndex ?? 0}, citations ${s.faculty?.citationCount ?? 0}`,
        variant: 'success',
      });
      if (s.authorRetrievalError) {
        toast({
          title: 'Author Retrieval unavailable',
          description:
            'Free-tier Scopus keys cannot fetch author-level metrics; h-index/i10 were computed from per-DOI citation counts.',
          variant: 'info',
          duration: 8000,
        });
      }
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not sync from Scopus.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Scopus enrichment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-text-muted">
          Provide your Scopus Author ID to pull the authoritative h-index and per-publication
          citation counts. Compose i10-index from those counts. Requires an Elsevier API key
          (configured server-side).
        </p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
              Scopus Author ID
            </label>
            <Input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. 7005704970"
            />
          </div>
          <Button onClick={submit} disabled={syncing || !value.trim()}>
            {syncing ? 'Syncing Scopus…' : 'Sync from Scopus'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
