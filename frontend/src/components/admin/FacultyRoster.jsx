import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  BadgeCheck,
  Clock,
  XCircle,
  Mail,
  Hourglass,
  RefreshCcw,
  Loader2,
  ThumbsUp,
  Ban,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert, AlertDescription } from '../ui/Alert';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import {
  listFacultyRoster,
  approveFaculty,
  rejectFaculty,
} from '../../services/institution.service';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending approval', icon: Clock },
  { key: 'verified', label: 'Verified', icon: BadgeCheck },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
  { key: 'all', label: 'All', icon: Users },
];

function StatusPill({ status, awaitingOnboarding }) {
  if (awaitingOnboarding) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border bg-yellow-100 text-yellow-700 border-yellow-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
        <Hourglass size={11} /> Awaiting onboarding
      </span>
    );
  }
  const map = {
    verified: {
      cls: 'bg-success/10 text-success border-success/30',
      icon: BadgeCheck,
      label: 'Verified',
    },
    pending: {
      cls: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: Clock,
      label: 'Pending',
    },
    rejected: {
      cls: 'bg-danger/10 text-danger border-danger/30',
      icon: XCircle,
      label: 'Rejected',
    },
  };
  const meta = map[status] || map.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}
    >
      <Icon size={11} /> {meta.label}
    </span>
  );
}

function FacultyRow({ item, onApprove, onReject, busy }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const initials = (item.name || item.email || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();

  const isPending = item.verificationStatus === 'pending';

  return (
    <div className="rounded-md border border-border bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-extrabold text-xs"
            style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-text-light truncate">
              {item.name || <span className="italic text-text-muted">(no name yet)</span>}
            </div>
            <div className="text-xs text-text-muted mt-0.5 truncate">
              {item.designation
                ? item.designation === 'Professor'
                  ? 'Professor'
                  : `${item.designation} Professor`
                : ''}
              {item.department ? ` · ${item.department}` : ''}
            </div>
            <div className="text-xs text-text-muted mt-1 flex items-center gap-1.5 truncate">
              <Mail size={11} />
              <span className="truncate">{item.email}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusPill
            status={item.verificationStatus}
            awaitingOnboarding={item.awaitingOnboarding}
          />
          {isPending && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => onApprove(item.id)}
                disabled={busy}
                className="bg-success hover:bg-success/90 text-white"
              >
                <ThumbsUp size={12} className="mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReject(v => !v)}
                disabled={busy}
                className="border-danger/30 text-danger hover:bg-danger/5"
              >
                <Ban size={12} className="mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      {isPending && showReject && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <Input
            placeholder="Optional reason (sent to faculty)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={busy}
            maxLength={300}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowReject(false);
                setReason('');
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onReject(item.id, reason.trim() || undefined);
                setShowReject(false);
                setReason('');
              }}
              disabled={busy}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              Confirm reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacultyRoster() {
  const { toast } = useToast();
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState({ faculty: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = tab === 'all' ? {} : { status: tab };
      const result = await listFacultyRoster(params);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load roster');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => {
    return data.faculty.reduce(
      (acc, f) => {
        acc.total += 1;
        acc[f.verificationStatus] = (acc[f.verificationStatus] || 0) + 1;
        return acc;
      },
      { total: 0 },
    );
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.faculty;
    return data.faculty.filter(
      f =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q) ||
        (f.department || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const doApprove = async id => {
    setBusy(true);
    try {
      await approveFaculty(id);
      toast({
        title: 'Faculty approved',
        description: 'They now appear as a verified member of your institution.',
        variant: 'success',
      });
      refresh();
    } catch (err) {
      toast({
        title: 'Could not approve',
        description: err.response?.data?.error?.message || 'Please try again',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const doReject = async (id, reason) => {
    setBusy(true);
    try {
      await rejectFaculty(id, reason);
      toast({
        title: 'Rejected',
        description: 'The faculty has been notified.',
        variant: 'info',
      });
      refresh();
    } catch (err) {
      toast({
        title: 'Could not reject',
        description: err.response?.data?.error?.message || 'Please try again',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Faculty roster"
      subtitle="Review pending signups and manage verified faculty at your institution"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border">
          <div className="flex flex-wrap gap-0.5">
            {STATUS_TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-muted hover:text-text-light'
                  }`}
                >
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name, email, department"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs w-56"
            />
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        <div className="text-xs text-text-muted">
          {loading ? (
            'Loading…'
          ) : (
            <>
              {filtered.length === data.faculty.length ? (
                <>
                  Showing <span className="font-semibold text-text-light">{counts.total}</span>{' '}
                  {tab === 'all' ? '' : tab}
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-text-light">{filtered.length}</span>{' '}
                  of {counts.total}
                </>
              )}
            </>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-text-muted flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading roster…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title={
              tab === 'pending'
                ? 'No pending approvals'
                : tab === 'verified'
                  ? 'No verified faculty yet'
                  : tab === 'rejected'
                    ? 'No rejected faculty'
                    : 'Roster is empty'
            }
            description={
              tab === 'pending'
                ? "Faculty who sign up and pick your institution will appear here for approval."
                : 'Try the Invite tab to add faculty.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map(item => (
              <FacultyRow
                key={item.id}
                item={item}
                onApprove={doApprove}
                onReject={doReject}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
