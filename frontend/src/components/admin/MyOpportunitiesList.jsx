import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, BadgeCheck, ShieldAlert, Clock, CalendarClock, ExternalLink } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { Alert, AlertDescription } from '../ui/Alert';
import { Button } from '../ui/Button';
import { listMyOpportunities } from '../../services/opportunity.service';

const TYPE_LABEL = { fdp: 'FDP', conference: 'Conf', grant: 'Grant', journal: 'Journal' };
const TYPE_COLOR = {
  fdp: '#6C5CE7',
  conference: '#00B894',
  grant: '#F59E0B',
  journal: '#1A237E',
};

const STATUS_STYLES = {
  live: 'bg-success/10 text-success border-success/30',
  pending_review: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  draft: 'bg-muted text-text-muted border-border',
  delisted: 'bg-danger/10 text-danger border-danger/30',
};

const BADGE_STYLES = {
  ugc_care_verified: { cls: 'bg-success/10 text-success border-success/30', label: 'UGC-CARE', icon: BadgeCheck },
  scopus_indexed: { cls: 'bg-primary/10 text-primary border-primary/30', label: 'Scopus', icon: BadgeCheck },
  unverified: { cls: 'bg-muted text-text-muted border-border', label: 'Unverified', icon: ShieldAlert },
};

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        STATUS_STYLES[status] || STATUS_STYLES.draft
      }`}
    >
      {status === 'pending_review' ? 'Pending' : status}
    </span>
  );
}

function VerificationBadge({ badge }) {
  const meta = BADGE_STYLES[badge] || BADGE_STYLES.unverified;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}
    >
      <Icon size={10} /> {meta.label}
    </span>
  );
}

export default function MyOpportunitiesList({ onPostNew }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listMyOpportunities();
      setItems(list);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load postings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const trailing = items.length > 0 && (
    <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
      {loading ? 'Refreshing…' : 'Refresh'}
    </Button>
  );

  return (
    <SectionCard
      title="Your opportunities"
      subtitle="Everything posted from your institution"
      trailing={trailing}
    >
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <SkeletonList count={3} cardLines={2} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={20} />}
          title="No opportunities posted yet"
          description="Publish an FDP, conference, grant call, or journal listing to reach faculty across India."
          action={
            onPostNew && (
              <Button size="sm" onClick={onPostNew}>
                Post your first opportunity
              </Button>
            )
          }
        />
      ) : (
        <div className="divide-y divide-border -my-2">
          {items.map(opp => {
            const days = daysUntil(opp.deadline);
            const color = TYPE_COLOR[opp.type] || '#6C5CE7';
            const past = days < 0;
            return (
              <div key={opp.id} className="py-3 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {TYPE_LABEL[opp.type] || opp.type}
                    </span>
                    <StatusPill status={opp.status} />
                    <VerificationBadge badge={opp.verificationBadge} />
                  </div>
                  <div className="font-semibold text-text-light truncate">{opp.title}</div>
                  <div className="text-xs text-text-muted mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={11} />
                      {new Date(opp.deadline).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${past ? 'text-danger' : days <= 7 ? 'text-danger' : ''}`}>
                      <Clock size={11} />
                      {past ? 'Deadline passed' : `${days}d left`}
                    </span>
                    {opp.mode && <span className="capitalize">{opp.mode}</span>}
                    {typeof opp.cost === 'number' && (
                      <span>{opp.cost === 0 ? 'Free' : `Rs. ${opp.cost.toLocaleString('en-IN')}`}</span>
                    )}
                  </div>
                </div>
                {opp.url && (
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    Organizer page <ExternalLink size={12} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
