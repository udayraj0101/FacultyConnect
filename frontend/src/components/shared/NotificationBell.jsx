import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import {
  listNotifications,
  getNotificationsSummary,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notification.service';

const TYPE_META = {
  connect_request_received: { Icon: Handshake, color: '#6C5CE7' },
  connect_request_accepted: { Icon: CheckCircle2, color: '#00B894' },
  connect_request_declined: { Icon: XCircle, color: '#EF4444' },
  application_status_changed: { Icon: Briefcase, color: '#1A237E' },
  faculty_approved: { Icon: BadgeCheck, color: '#00B894' },
  faculty_rejected: { Icon: XCircle, color: '#EF4444' },
  invitation_accepted: { Icon: UserCheck, color: '#6C5CE7' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  const loadSummary = useCallback(async () => {
    try {
      const s = await getNotificationsSummary();
      setUnread(s.unread || 0);
    } catch {
      /* non-fatal */
    }
  }, []);

  // Poll every 60s (same cadence as the connect-request summary).
  useEffect(() => {
    loadSummary();
    const t = setInterval(loadSummary, 60_000);
    return () => clearInterval(t);
  }, [loadSummary]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Load recent list every time the dropdown opens.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    listNotifications({ limit: 10 })
      .then(list => {
        if (!cancelled) setNotifications(list);
      })
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onClickItem = async n => {
    setOpen(false);
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setUnread(u => Math.max(0, u - 1));
      } catch {
        /* non-fatal — user can still navigate */
      }
    }
    if (n.link) navigate(n.link);
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      /* non-fatal */
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        className="relative p-2 rounded-full text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-danger text-white text-[9px] font-bold px-1 tabular-nums ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white shadow-lg overflow-hidden z-40"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-secondary">Notifications</div>
            {unread > 0 && (
              <button
                onClick={onMarkAll}
                className="text-[11px] text-primary font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-xs text-text-muted text-center">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Inbox size={28} className="mx-auto text-text-muted opacity-50" />
                <div className="mt-2 text-sm text-text-light font-semibold">Inbox is clear</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  We&apos;ll notify you when there&apos;s activity.
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map(n => {
                  const meta = TYPE_META[n.type] || { Icon: Bell, color: '#64748B' };
                  const Icon = meta.Icon;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => onClickItem(n)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors ${
                          !n.read ? 'bg-primary/[0.03]' : ''
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className={`text-sm leading-tight ${
                                !n.read ? 'font-bold text-text-light' : 'font-medium text-text-light'
                              }`}
                            >
                              {n.title}
                            </div>
                            {!n.read && (
                              <span
                                className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5"
                                aria-label="Unread"
                              />
                            )}
                          </div>
                          {n.body && (
                            <div className="text-xs text-text-muted mt-0.5 line-clamp-2">
                              {n.body}
                            </div>
                          )}
                          <div className="text-[11px] text-text-muted mt-1">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="w-full text-center text-xs font-semibold text-primary hover:underline"
            >
              See all notifications
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
