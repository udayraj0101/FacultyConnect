import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Building2,
  BadgeCheck,
  User2,
  Users,
  Search,
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
  listConnectRequests,
  respondToRequest,
  listMyConnections,
} from '../services/connectRequest.service';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

const DIRECTION_TABS = [
  { key: 'received', label: 'Received', icon: <Inbox size={14} /> },
  { key: 'sent', label: 'Sent', icon: <Send size={14} /> },
  { key: 'network', label: 'My Network', icon: <Users size={14} /> },
];

const PURPOSE_LABEL = {
  co_author: 'Co-author a paper',
  phd_advisory: 'PhD advisory / co-supervision',
  joint_fdp: 'Host a joint FDP',
  guest_lecture: 'Guest lecture invitation',
  grant_collab: 'Grant collaboration',
  other: 'Other',
};

function StatusIcon({ status }) {
  if (status === 'accepted') return <CheckCircle2 size={14} className="text-success" />;
  if (status === 'declined') return <XCircle size={14} className="text-danger" />;
  return <Clock size={14} className="text-yellow-600" />;
}

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .join('')
    .toUpperCase();
}

function RequestCard({ request, direction, onRespond, submitting }) {
  const counterpart = direction === 'sent' ? request.to : request.from;

  return (
    <motion.article
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-xl bg-white border border-border p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0"
            style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
          >
            {initialsOf(counterpart?.name)}
          </div>
          <div className="min-w-0">
            <Link
              to={`/directory/${counterpart?.id}`}
              className="text-sm font-bold text-text-light hover:text-primary truncate"
            >
              {counterpart?.name || '(unknown)'}
            </Link>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              <User2 size={11} />
              <span>{counterpart?.designation}</span>
              {counterpart?.institution && (
                <>
                  <span>·</span>
                  <Building2 size={11} />
                  <span className="truncate">{counterpart.institution.name}</span>
                  {counterpart.institution.verificationStatus === 'verified' && (
                    <BadgeCheck size={11} className="text-success" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
          <StatusIcon status={request.status} />
          {request.status}
        </span>
      </div>

      <div>
        <span className="inline-flex items-center rounded-md bg-primary/10 text-primary text-[11px] px-2 py-0.5 font-semibold uppercase tracking-wider">
          {PURPOSE_LABEL[request.purpose] || request.purpose}
        </span>
      </div>

      <p className="text-sm text-text-light bg-muted/50 rounded-md p-3 leading-relaxed">
        {request.message}
      </p>

      <div className="text-[11px] text-text-muted">
        {direction === 'sent' ? 'Sent' : 'Received'}{' '}
        {new Date(request.createdAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        {request.respondedAt && (
          <>
            {' · '}Responded{' '}
            {new Date(request.respondedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </>
        )}
      </div>

      {/* Contact reveal (accepted only) */}
      {request.status === 'accepted' && counterpart?.email && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-success/5 border border-success/20 px-3 py-2">
          <div className="text-xs text-success font-semibold">
            Contact unlocked — continue off-platform.
          </div>
          <a
            href={`mailto:${counterpart.email}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-light hover:text-primary"
          >
            <Mail size={12} /> {counterpart.email}
          </a>
        </div>
      )}

      {/* Actions for received-pending only */}
      {direction === 'received' && request.status === 'pending' && (
        <div className="flex gap-2 justify-end pt-1">
          <Button
            size="sm"
            variant="outline"
            className="border-danger/40 text-danger hover:bg-danger/5"
            disabled={submitting}
            onClick={() => onRespond(request.id, 'declined')}
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="bg-success hover:bg-success/90 text-white"
            disabled={submitting}
            onClick={() => onRespond(request.id, 'accepted')}
          >
            Accept
          </Button>
        </div>
      )}
    </motion.article>
  );
}

function ConnectionCard({ connection }) {
  const cp = connection.counterpart;
  return (
    <motion.article
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-xl bg-white border border-border p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0"
            style={{ background: 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)' }}
          >
            {initialsOf(cp?.name)}
          </div>
          <div className="min-w-0">
            <Link
              to={`/directory/${cp?.id}`}
              className="text-sm font-bold text-text-light hover:text-primary truncate"
            >
              {cp?.name || '(unknown)'}
            </Link>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
              <User2 size={11} />
              <span>{cp?.designation}</span>
              {cp?.institution && (
                <>
                  <span>·</span>
                  <Building2 size={11} />
                  <span className="truncate">{cp.institution.name}</span>
                  {cp.institution.verificationStatus === 'verified' && (
                    <BadgeCheck size={11} className="text-success" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-success">
          <CheckCircle2 size={12} /> Connected
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-md bg-primary/10 text-primary text-[11px] px-2 py-0.5 font-semibold uppercase tracking-wider">
          {PURPOSE_LABEL[connection.purpose] || connection.purpose}
        </span>
        <span className="text-[11px] text-text-muted">
          {connection.initiatedBy === 'you' ? 'You reached out' : 'They reached out'}
        </span>
      </div>

      {cp?.email && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-success/5 border border-success/20 px-3 py-2">
          <a
            href={`mailto:${cp.email}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-light hover:text-primary"
          >
            <Mail size={12} /> {cp.email}
          </a>
          {connection.connectedAt && (
            <span className="text-[11px] text-text-muted">
              Connected{' '}
              {new Date(connection.connectedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      )}
    </motion.article>
  );
}

export default function ConnectRequests() {
  const { toast } = useToast();
  const [direction, setDirection] = useState('received');
  const [status, setStatus] = useState('pending');
  const [data, setData] = useState({ requests: [] });
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkPurposes, setNetworkPurposes] = useState(() => new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (direction === 'network') {
        const result = await listMyConnections();
        setConnections(result.connections || []);
      } else {
        const result = await listConnectRequests({ direction, status });
        setData(result);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [direction, status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const respond = async (id, decision) => {
    if (busy) return;
    setBusy(true);
    try {
      await respondToRequest(id, decision);
      toast({
        title: decision === 'accepted' ? 'Request accepted' : 'Request declined',
        description:
          decision === 'accepted'
            ? 'Contact details are now revealed to both of you.'
            : 'The sender has been notified.',
        variant: decision === 'accepted' ? 'success' : 'info',
      });
      refresh();
    } catch (err) {
      toast({
        title: 'Could not respond',
        description: err.response?.data?.error?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const pendingReceived = data.requests.filter(r => r.status === 'pending').length;
  const isNetwork = direction === 'network';

  // Purposes actually present in the current network, so we only show
  // chips the user can meaningfully click.
  const availablePurposes = useMemo(() => {
    const set = new Set();
    for (const c of connections) if (c.purpose) set.add(c.purpose);
    return [...set];
  }, [connections]);

  const filteredConnections = useMemo(() => {
    const q = networkSearch.trim().toLowerCase();
    return connections.filter(c => {
      if (networkPurposes.size > 0 && !networkPurposes.has(c.purpose)) return false;
      if (!q) return true;
      const cp = c.counterpart || {};
      return (
        (cp.name || '').toLowerCase().includes(q) ||
        (cp.institution?.name || '').toLowerCase().includes(q) ||
        (cp.department || '').toLowerCase().includes(q)
      );
    });
  }, [connections, networkSearch, networkPurposes]);

  const togglePurpose = key => {
    setNetworkPurposes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearNetworkFilters = () => {
    setNetworkSearch('');
    setNetworkPurposes(new Set());
  };

  const hasNetworkFilters = networkSearch.trim() || networkPurposes.size > 0;

  const sectionTitle = isNetwork ? 'My Network' : 'Inbox';
  const sectionSubtitle = isNetwork
    ? 'Everyone who accepted a connect request — or whose request you accepted.'
    : 'Received & sent requests';

  const heroStats = isNetwork
    ? [
        { icon: <Users size={18} />, value: connections.length, label: 'Total connections' },
        {
          icon: <Send size={18} />,
          value: connections.filter(c => c.initiatedBy === 'you').length,
          label: 'You reached out',
        },
        {
          icon: <Inbox size={18} />,
          value: connections.filter(c => c.initiatedBy === 'them').length,
          label: 'They reached out',
        },
      ]
    : [
        { icon: <Inbox size={18} />, value: pendingReceived, label: 'Awaiting your reply' },
        {
          icon: <CheckCircle2 size={18} />,
          value: data.requests.filter(r => r.status === 'accepted').length,
          label: 'In current view',
        },
        {
          icon: <Send size={18} />,
          value: data.requests.length,
          label: 'Total in view',
        },
      ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title="Connect Requests"
        subtitle="Structured collaboration asks — 300-character messages, no open chat. Accept to reveal contact and continue off-platform."
        emoji="🤝"
        stats={heroStats}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SectionCard title={sectionTitle} subtitle={sectionSubtitle}>
        <div className="flex items-center justify-between gap-4 mb-4 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {DIRECTION_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setDirection(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  direction === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-light'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {!isNetwork && (
            <div className="flex gap-1 flex-wrap pb-2">
              {STATUS_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setStatus(t.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    status === t.key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-muted border-border hover:text-text-light'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <SkeletonList count={2} cardLines={3} />
        ) : isNetwork ? (
          connections.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title="No connections yet"
              description="Once someone accepts your connect request — or you accept theirs — they'll appear here with contact revealed."
              action={
                <Link to="/directory" className="text-sm text-primary font-semibold hover:underline">
                  Browse directory →
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <Input
                    placeholder="Search connections by name, institution, or department"
                    value={networkSearch}
                    onChange={e => setNetworkSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {availablePurposes.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availablePurposes.map(key => {
                      const active = networkPurposes.has(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePurpose(key)}
                          className={`inline-flex items-center rounded-full text-[11px] px-2.5 py-1 border transition-colors ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-text-muted border-border hover:text-primary hover:border-primary/40'
                          }`}
                        >
                          {PURPOSE_LABEL[key] || key}
                        </button>
                      );
                    })}
                    {hasNetworkFilters && (
                      <button
                        type="button"
                        onClick={clearNetworkFilters}
                        className="text-[11px] text-primary font-semibold hover:underline px-2 py-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <div className="text-xs text-text-muted">
                  {filteredConnections.length === connections.length ? (
                    <>Showing all <span className="font-semibold text-text-light">{connections.length}</span> connection{connections.length === 1 ? '' : 's'}</>
                  ) : (
                    <>
                      Showing{' '}
                      <span className="font-semibold text-text-light">
                        {filteredConnections.length}
                      </span>{' '}
                      of {connections.length}
                    </>
                  )}
                </div>
              </div>

              {filteredConnections.length === 0 ? (
                <EmptyState
                  icon={<Search size={20} />}
                  title="No connections match"
                  description="Try different search terms or clear the purpose filters."
                  action={
                    hasNetworkFilters ? (
                      <Button size="sm" variant="outline" onClick={clearNetworkFilters}>
                        Clear filters
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredConnections.map(c => (
                    <ConnectionCard key={c.requestId} connection={c} />
                  ))}
                </div>
              )}
            </div>
          )
        ) : data.requests.length === 0 ? (
          <EmptyState
            icon={direction === 'received' ? <Inbox size={20} /> : <Send size={20} />}
            title={`No ${status} ${direction === 'received' ? 'requests' : 'sent requests'}`}
            description={
              direction === 'received'
                ? "When someone sends you a collaboration request, it'll show up here."
                : "You haven't sent any yet — head to the Directory to find collaborators."
            }
            action={
              direction === 'sent' ? (
                <Link
                  to="/directory"
                  className="text-sm text-primary font-semibold hover:underline"
                >
                  Browse directory →
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="space-y-3">
            {data.requests.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                direction={direction}
                onRespond={respond}
                submitting={busy}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
