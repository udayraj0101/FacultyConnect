import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Handshake,
  CheckCircle2,
  XCircle,
  Briefcase,
  BadgeCheck,
  UserCheck,
  Inbox,
  CheckCheck,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import HeroBanner from '../components/dashboard/HeroBanner';
import SectionCard from '../components/dashboard/SectionCard';
import { useToast } from '../components/ui/Toast';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';

const TYPE_META = {
  connect_request_received: { Icon: Handshake, color: '#6C5CE7', label: 'Connect request' },
  connect_request_accepted: { Icon: CheckCircle2, color: '#00B894', label: 'Connection accepted' },
  connect_request_declined: { Icon: XCircle, color: '#EF4444', label: 'Connection declined' },
  application_status_changed: { Icon: Briefcase, color: '#1A237E', label: 'Application update' },
  faculty_approved: { Icon: BadgeCheck, color: '#00B894', label: 'Faculty verified' },
  faculty_rejected: { Icon: XCircle, color: '#EF4444', label: 'Verification denied' },
  invitation_accepted: { Icon: UserCheck, color: '#6C5CE7', label: 'Invitation accepted' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listNotifications({
        unreadOnly: tab === 'unread',
        limit: 50,
      });
      setNotifications(list);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const onClickItem = async n => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        /* non-fatal */
      }
    }
    if (n.link) navigate(n.link);
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({ title: 'All marked read', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not mark all read',
        description: err.response?.data?.error?.message || 'Please try again',
        variant: 'error',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title="Notifications"
        subtitle="Everything that happened while you were away — connection responses, application updates, invitations, verification decisions."
        icon={<Bell strokeWidth={1.4} />}
        stats={[
          { icon: <Inbox size={18} />, value: notifications.length, label: 'In view' },
          { icon: <CheckCheck size={18} />, value: unreadCount, label: 'Unread' },
        ]}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SectionCard title="Inbox" subtitle="Tap a card to jump to the related page">
        <div className="flex items-center justify-between gap-3 mb-4 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {FILTER_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-light'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={onMarkAll}>
              <CheckCheck size={13} className="mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <SkeletonList count={4} cardLines={2} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} />}
            title={tab === 'unread' ? 'Nothing unread' : 'Inbox is clear'}
            description={
              tab === 'unread'
                ? "You're all caught up."
                : "When there's activity on your connections, applications, or invitations, it'll appear here."
            }
          />
        ) : (
          <ul className="space-y-2">
            {notifications.map(n => {
              const meta = TYPE_META[n.type] || { Icon: Bell, color: '#64748B', label: 'Update' };
              const Icon = meta.Icon;
              return (
                <motion.li
                  key={n.id}
                  initial={{ y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <button
                    onClick={() => onClickItem(n)}
                    className={`w-full text-left rounded-lg border transition-all flex items-start gap-3 p-4 ${
                      !n.read
                        ? 'bg-primary/[0.03] border-primary/20 hover:border-primary/40'
                        : 'bg-white border-border hover:border-primary/30 hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <span
                            className="inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted">{formatDate(n.createdAt)}</div>
                      </div>
                      <div
                        className={`mt-1.5 text-sm ${!n.read ? 'font-bold text-text-light' : 'font-medium text-text-light'}`}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
                          {n.body}
                        </div>
                      )}
                    </div>
                    {!n.read && (
                      <span
                        className="w-2 h-2 rounded-full bg-primary shrink-0 mt-3"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
