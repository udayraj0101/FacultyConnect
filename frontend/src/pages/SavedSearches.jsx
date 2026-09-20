import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Trash2,
  Play,
  Sparkles,
  Search as SearchIcon,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import HeroBanner from '../components/dashboard/HeroBanner';
import SectionCard from '../components/dashboard/SectionCard';
import {
  listSavedSearches,
  updateSavedSearch,
  deleteSavedSearch,
} from '../services/savedSearch.service';

const TYPE_META = {
  fdp: { label: 'FDPs', slug: 'fdps', color: '#F59E0B' },
  conference: { label: 'Conferences', slug: 'conferences', color: '#6C5CE7' },
  grant: { label: 'Grants', slug: 'grants', color: '#00B894' },
  journal: { label: 'Journals', slug: 'journals', color: '#1A237E' },
};

// Human summary of the filter blob for the row description. Kept short —
// the full filter combo replays when the user clicks "Open in Discover".
function summarize(filters) {
  const parts = [];
  if (filters?.domain?.length) parts.push(`Domain: ${filters.domain.join(', ')}`);
  if (filters?.indexing?.length) parts.push(`Indexing: ${filters.indexing.join(', ')}`);
  if (filters?.agency?.length) parts.push(`Agency: ${filters.agency.join(', ')}`);
  if (filters?.career_stage?.length) parts.push(`Stage: ${filters.career_stage.join(', ')}`);
  if (filters?.credit_hours_min) parts.push(`≥${filters.credit_hours_min} CPD hours`);
  if (filters?.certificate === 'true') parts.push('Certificate provided');
  if (filters?.mode) parts.push(`Mode: ${filters.mode}`);
  if (filters?.cost) parts.push(filters.cost === 'free' ? 'Free' : 'Paid');
  if (filters?.q) parts.push(`"${filters.q}"`);
  return parts.length ? parts.join(' · ') : 'No filters — matches every new listing of this type.';
}

function SavedSearchRow({ item, onDelete, onToggleAlerts, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [busy, setBusy] = useState(false);
  const meta = TYPE_META[item.type] || { label: item.type, slug: item.type, color: '#6C5CE7' };

  const commitRename = async () => {
    const next = draftName.trim();
    if (!next || next === item.name) {
      setEditing(false);
      setDraftName(item.name);
      return;
    }
    setBusy(true);
    try {
      await onRename(item.id, next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                maxLength={100}
                autoFocus
                className="h-8 text-sm"
              />
              <button
                onClick={commitRename}
                disabled={busy}
                className="p-1.5 rounded-md text-success hover:bg-success/10"
                aria-label="Save name"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraftName(item.name);
                }}
                disabled={busy}
                className="p-1.5 rounded-md text-text-muted hover:bg-muted"
                aria-label="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.label}
              </span>
              <h3 className="font-bold text-text-light truncate">{item.name}</h3>
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded-md text-text-muted hover:text-primary hover:bg-primary/5"
                aria-label="Rename"
                title="Rename"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {summarize(item.filters)}
          </p>
          <p className="text-[11px] text-text-muted mt-1.5">
            Saved {new Date(item.createdAt).toLocaleDateString()}
            {item.lastAlertedAt && (
              <> · Last checked {new Date(item.lastAlertedAt).toLocaleDateString()}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggleAlerts(item.id, !item.alertsEnabled)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              item.alertsEnabled
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-text-muted border-border'
            }`}
            title={item.alertsEnabled ? 'Alerts on — click to disable' : 'Alerts off — click to enable'}
          >
            {item.alertsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
            {item.alertsEnabled ? 'Alerts on' : 'Alerts off'}
          </button>
          <Link
            to={`/discover/${meta.slug}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-light hover:border-primary/40 hover:text-primary"
          >
            <Play size={12} />
            Open
          </Link>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/5"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SavedSearches() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    try {
      const result = await listSavedSearches();
      setItems(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load saved searches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onToggleAlerts = async (id, next) => {
    try {
      const updated = await updateSavedSearch(id, { alertsEnabled: next });
      setItems(prev => prev.map(x => (x.id === id ? updated : x)));
      toast({
        title: next ? 'Alerts enabled' : 'Alerts disabled',
        variant: next ? 'success' : 'info',
      });
    } catch (err) {
      toast({
        title: 'Could not update alerts',
        description: err.response?.data?.error?.message,
        variant: 'destructive',
      });
    }
  };

  const onRename = async (id, name) => {
    const updated = await updateSavedSearch(id, { name });
    setItems(prev => prev.map(x => (x.id === id ? updated : x)));
    toast({ title: 'Renamed', variant: 'success' });
  };

  const onDelete = async id => {
    if (!confirm('Delete this saved search? Alerts will stop immediately.')) return;
    try {
      await deleteSavedSearch(id);
      setItems(prev => prev.filter(x => x.id !== id));
      toast({ title: 'Deleted', variant: 'info' });
    } catch (err) {
      toast({
        title: 'Could not delete',
        description: err.response?.data?.error?.message,
        variant: 'destructive',
      });
    }
  };

  const stats = useMemo(() => {
    const withAlerts = items.filter(x => x.alertsEnabled).length;
    return [
      { icon: <SearchIcon size={18} />, value: items.length, label: 'Saved searches' },
      { icon: <Bell size={18} />, value: withAlerts, label: 'With alerts on' },
    ];
  }, [items]);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title="Saved searches"
        subtitle="Reopen any filter combo in one click and get pinged when new matches are posted."
        icon={<Sparkles strokeWidth={1.4} />}
        stats={stats}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <SkeletonList count={3} cardLines={3} />}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<SearchIcon size={20} />}
          title="No saved searches yet"
          description="Head to Discover, dial in a filter combo, and hit 'Save this search'. Nightly alerts are on by default."
          action={
            <Button size="sm" onClick={() => navigate('/discover/fdps')}>
              Explore Discover
            </Button>
          }
        />
      )}

      {!loading && items.length > 0 && (
        <SectionCard
          title="Your searches"
          subtitle="Rename inline. Toggle alerts on/off. Delete when you're done."
        >
          <div className="space-y-3">
            {items.map(item => (
              <SavedSearchRow
                key={item.id}
                item={item}
                onDelete={onDelete}
                onToggleAlerts={onToggleAlerts}
                onRename={onRename}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
