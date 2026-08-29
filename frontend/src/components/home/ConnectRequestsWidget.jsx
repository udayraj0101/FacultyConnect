import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, ArrowRight } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { listConnectRequests, PURPOSE_OPTIONS } from '../../services/connectRequest.service';

const PURPOSE_LABEL = Object.fromEntries(PURPOSE_OPTIONS.map(o => [o.value, o.label]));

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ConnectRequestsWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listConnectRequests({ direction: 'received', status: 'pending' });
        if (!cancelled) setItems(res.requests || []);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionCard
      title="Incoming collaboration requests"
      subtitle="Awaiting your response"
      trailing={
        items.length > 0 && (
          <Link to="/requests" className="text-xs font-semibold text-primary hover:underline">
            Open inbox →
          </Link>
        )
      }
    >
      {loading ? (
        <SkeletonList count={2} cardLines={1} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Handshake size={18} />}
          title="Inbox is clear"
          description="When another faculty member reaches out about co-authoring, hosting an FDP, or a joint grant, it'll show up here."
          action={
            <Link
              to="/directory"
              className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
            >
              Browse directory <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 5).map(req => (
            <Link
              to="/requests"
              key={req.id}
              className="py-3 flex items-start justify-between gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-light truncate">
                  {req.from?.name || 'Anonymous'}
                </div>
                <div className="text-xs text-text-muted mt-0.5 truncate">
                  {req.purposeLabel || PURPOSE_LABEL[req.purpose] || req.purpose}
                  {req.from?.institution?.name ? ` · ${req.from.institution.name}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-[11px] font-semibold text-text-muted">
                {timeAgo(req.createdAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
