import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight, BadgeCheck, ShieldAlert } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { listMyBookmarks } from '../../services/opportunity.service';

const TYPE_COLOR = {
  fdp: '#6C5CE7',
  conference: '#00B894',
  grant: '#F59E0B',
  journal: '#1A237E',
};

const TYPE_LABEL = {
  fdp: 'FDP',
  conference: 'Conf',
  grant: 'Grant',
  journal: 'Journal',
};

function badgeIcon(badge) {
  if (badge === 'ugc_care_verified' || badge === 'scopus_indexed') {
    return <BadgeCheck size={12} className="text-success" />;
  }
  return <ShieldAlert size={12} className="text-text-muted" />;
}

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function MyBookmarksWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyBookmarks();
        if (!cancelled) setItems(list);
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
      title="Bookmarked opportunities"
      subtitle="Saved for later"
      trailing={
        items.length > 0 && (
          <Link to="/discover" className="text-xs font-semibold text-primary hover:underline">
            Browse more →
          </Link>
        )
      }
    >
      {loading ? (
        <SkeletonList count={2} cardLines={1} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={18} />}
          title="No bookmarks yet"
          description="On the Discover feed, click the bookmark icon to save an opportunity here for quick reference."
          action={
            <Link
              to="/discover"
              className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
            >
              Explore opportunities <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 5).map(opp => {
            const days = daysUntil(opp.deadline);
            const color = TYPE_COLOR[opp.type] || '#6C5CE7';
            return (
              <div key={opp.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-2">
                  <span
                    className="mt-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {TYPE_LABEL[opp.type]}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-light truncate">
                      {opp.title}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                      {badgeIcon(opp.verificationBadge)}
                      <span className="truncate">{opp.organizerName}</span>
                    </div>
                  </div>
                </div>
                <div
                  className={`shrink-0 text-[11px] font-semibold ${days <= 7 ? 'text-danger' : 'text-text-muted'}`}
                >
                  {days < 0 ? 'closed' : `${days}d left`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
