import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Flag, Newspaper, Users, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import AdminShell from '../components/shared/AdminShell';
import PlatformOverview from '../components/admin/PlatformOverview';
import { listVerifications, reviewVerification } from '../services/admin.service';
import { listAdminReports, reviewReport } from '../services/report.service';

const ACCENT = '#1A237E';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { key: 'verifications', label: 'Verifications', icon: <ShieldCheck size={16} /> },
  { key: 'reports', label: 'Reports & Grievances', icon: <Flag size={16} /> },
  { key: 'ugc-care', label: 'UGC-CARE Sync', icon: <Newspaper size={16} />, disabled: true, badge: 'soon' },
  { key: 'users', label: 'Users', icon: <Users size={16} />, disabled: true, badge: 'soon' },
];

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function StatusPill({ status }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    approved: 'bg-success/10 text-success border-success/30',
    rejected: 'bg-danger/10 text-danger border-danger/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function RequestRow({ request, onReviewed }) {
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async decision => {
    setError('');
    if (decision === 'rejected' && reason.trim().length < 5) {
      setError('Provide a rejection reason of at least 5 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await reviewVerification(request.id, {
        decision,
        reason: decision === 'rejected' ? reason.trim() : reason.trim() || undefined,
      });
      toast({
        title: decision === 'approved' ? 'Approved' : 'Rejected',
        description: `${updated.entity?.name || 'Entity'} · ${decision}`,
        variant: decision === 'approved' ? 'success' : 'info',
      });
      onReviewed(updated);
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || 'Review failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inst = request.entity;
  const isPending = request.status === 'pending';

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">
              {request.entityType}
            </div>
            <div className="text-lg font-bold text-secondary mt-1">
              {inst?.name || '(entity deleted)'}
            </div>
            <div className="text-sm text-text-muted mt-0.5">
              {inst?.domain}
              {inst?.aisheCode ? ` · AISHE ${inst.aisheCode}` : ''}
            </div>
          </div>
          <StatusPill status={request.status} />
        </div>

        {request.submittedDocs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
              Submitted documents
            </div>
            <ul className="text-sm text-text-light list-disc list-inside">
              {request.submittedDocs.map(d => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {!isPending && (
          <div className="text-xs text-text-muted border-t border-border pt-3">
            <div>
              Reviewed{' '}
              {request.reviewedAt
                ? new Date(request.reviewedAt).toLocaleString()
                : 'at unknown time'}
              {request.reviewedBy?.name ? ` by ${request.reviewedBy.name}` : ''}
            </div>
            {request.reason && (
              <div className="mt-1 italic">Reason: {request.reason}</div>
            )}
          </div>
        )}

        {isPending && (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {rejecting && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                  Rejection reason
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. AISHE code does not match records; please resubmit with UGC affiliation letter"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {!rejecting ? (
                <>
                  <Button
                    onClick={() => submit('approved')}
                    disabled={submitting}
                    className="bg-success hover:bg-success/90 text-white"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRejecting(true)}
                    disabled={submitting}
                    className="border-danger/40 text-danger hover:bg-danger/5"
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => submit('rejected')}
                    variant="destructive"
                    disabled={submitting}
                  >
                    Confirm rejection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejecting(false);
                      setReason('');
                      setError('');
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VerificationsSection() {
  const [activeStatus, setActiveStatus] = useState('pending');
  const [data, setData] = useState({ requests: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listVerifications({ status: activeStatus });
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-secondary">Verification Queue</h2>
        <p className="text-text-muted text-sm mt-1">
          Institution and organizer requests. Approvals set the entity to{' '}
          <span className="font-medium">verified</span>; rejections require a reason for the audit
          trail.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeStatus === tab.key
                ? 'border-secondary text-secondary'
                : 'border-transparent text-text-muted hover:text-text-light'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <div className="text-sm text-text-muted">
          {data.total} {activeStatus} request{data.total === 1 ? '' : 's'}
        </div>
      )}

      {loading && <SkeletonList count={2} cardLines={3} />}

      <div className="space-y-4">
        {!loading && data.requests.length === 0 && (
          <EmptyState
            title={`Nothing ${activeStatus}`}
            description={
              activeStatus === 'pending'
                ? 'Verification queue is clear. New requests will appear here.'
                : `No requests in this state.`
            }
          />
        )}
        {data.requests.map(req => (
          <RequestRow key={req.id} request={req} onReviewed={refresh} />
        ))}
      </div>
    </div>
  );
}

const REPORT_STATUS_TABS = [
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
];

const REPORT_STATUS_PILL = {
  open: 'bg-danger/10 text-danger border-danger/30',
  acknowledged: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  resolved: 'bg-success/10 text-success border-success/30',
  dismissed: 'bg-muted text-text-muted border-border',
};

const TARGET_TYPE_LABEL = {
  opportunity: 'Opportunity',
  job: 'Job',
  faculty: 'Faculty',
};

function formatSlaCountdown(deadlineIso, status) {
  if (status !== 'open') return null;
  const deadline = new Date(deadlineIso).getTime();
  const diffMs = deadline - Date.now();
  const overdue = diffMs < 0;
  const hours = Math.floor(Math.abs(diffMs) / (60 * 60 * 1000));
  if (overdue) {
    return { text: `Overdue by ${hours}h`, overdue: true };
  }
  if (hours < 1) {
    const mins = Math.floor(Math.abs(diffMs) / (60 * 1000));
    return { text: `${mins}m left`, overdue: false, urgent: true };
  }
  return { text: `${hours}h left`, overdue: false, urgent: hours < 12 };
}

function ReportRow({ report, onReviewed }) {
  const { toast } = useToast();
  const [dismissing, setDismissing] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sla = formatSlaCountdown(report.slaDeadline, report.status);
  const isOpen = report.status === 'open';
  const isTerminal = report.status === 'resolved' || report.status === 'dismissed';

  const submit = async decision => {
    setError('');
    if (decision === 'dismissed' && notes.trim().length < 5) {
      setError('Dismissal notes must be at least 5 characters for the audit trail.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await reviewReport(report.id, {
        decision,
        notes: notes.trim() || undefined,
      });
      toast({
        title: `Report ${decision}`,
        description: updated.targetSnapshot?.title || 'updated',
        variant: decision === 'dismissed' ? 'info' : 'success',
      });
      onReviewed(updated);
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || 'Review failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className={
        sla?.overdue
          ? 'border-l-4 border-l-danger'
          : sla?.urgent
            ? 'border-l-4 border-l-yellow-500'
            : ''
      }
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs uppercase tracking-wide text-text-muted font-semibold">
              <span>{TARGET_TYPE_LABEL[report.targetType] || report.targetType}</span>
              <span>·</span>
              <span className="text-danger">{report.categoryLabel}</span>
            </div>
            <div className="text-lg font-bold text-secondary mt-1 leading-tight">
              {report.targetSnapshot?.title || '(target snapshot missing)'}
            </div>
            {report.targetSnapshot?.subtitle && (
              <div className="text-sm text-text-muted mt-0.5">
                {report.targetSnapshot.subtitle}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${REPORT_STATUS_PILL[report.status]}`}
            >
              {report.status}
            </span>
            {sla && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  sla.overdue
                    ? 'bg-danger/10 text-danger'
                    : sla.urgent
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-muted text-text-muted'
                }`}
              >
                {sla.overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                {sla.text}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-sm text-text-light">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">
            Reporter's reason
          </div>
          <div className="whitespace-pre-wrap">{report.reason}</div>
        </div>

        <div className="text-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Reported by{' '}
            <span className="text-text-light font-medium">
              {report.reporter?.name || 'unknown'}
            </span>
            {report.reporter?.email ? ` · ${report.reporter.email}` : ''}
          </span>
          <span>
            {new Date(report.createdAt).toLocaleString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>

        {(report.acknowledgedAt || report.resolvedAt || report.reviewedBy) && (
          <div className="text-xs text-text-muted border-t border-border pt-3 space-y-0.5">
            {report.acknowledgedAt && (
              <div>
                Acknowledged{' '}
                {new Date(report.acknowledgedAt).toLocaleString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {report.reviewedBy?.name ? ` by ${report.reviewedBy.name}` : ''}
              </div>
            )}
            {report.resolvedAt && (
              <div>
                Closed{' '}
                {new Date(report.resolvedAt).toLocaleString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            )}
            {report.reviewNotes && (
              <div className="italic mt-1">Note: {report.reviewNotes}</div>
            )}
          </div>
        )}

        {!isTerminal && (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {dismissing && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                  Dismissal / resolution notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Listing removed by organizer. Reporter notified."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {!dismissing ? (
                <>
                  {isOpen && (
                    <Button
                      onClick={() => submit('acknowledged')}
                      disabled={submitting}
                      variant="outline"
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    onClick={() => submit('resolved')}
                    disabled={submitting}
                    className="bg-success hover:bg-success/90 text-white"
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDismissing(true)}
                    disabled={submitting}
                    className="border-danger/40 text-danger hover:bg-danger/5"
                  >
                    Dismiss
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => submit('dismissed')}
                    variant="destructive"
                    disabled={submitting}
                  >
                    Confirm dismissal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDismissing(false);
                      setNotes('');
                      setError('');
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReportsSection() {
  const [activeStatus, setActiveStatus] = useState('open');
  const [data, setData] = useState({ reports: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  // Recompute SLA countdown labels every minute without refetching.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdminReports({ status: activeStatus });
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const overdueCount = useMemo(
    () =>
      data.reports.filter(
        r => r.status === 'open' && new Date(r.slaDeadline).getTime() < Date.now(),
      ).length,
    [data.reports, tick],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-secondary">Reports & Grievances</h2>
        <p className="text-text-muted text-sm mt-1">
          Flagged opportunities, jobs, and faculty accounts. Per IT Rules 2021, every open report
          must be acknowledged within 72 hours — overdue rows are flagged in red.
        </p>
      </div>

      {overdueCount > 0 && activeStatus === 'open' && (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="font-semibold">{overdueCount}</span> open report
            {overdueCount === 1 ? ' is' : 's are'} past the 72-hour SLA. Acknowledge or resolve
            immediately.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-1 border-b border-border">
        {REPORT_STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeStatus === tab.key
                ? 'border-secondary text-secondary'
                : 'border-transparent text-text-muted hover:text-text-light'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <div className="text-sm text-text-muted">
          {data.total} {activeStatus} report{data.total === 1 ? '' : 's'}
        </div>
      )}

      {loading && <SkeletonList count={2} cardLines={3} />}

      <div className="space-y-4">
        {!loading && data.reports.length === 0 && (
          <EmptyState
            icon={<Flag size={20} />}
            title={`No ${activeStatus} reports`}
            description={
              activeStatus === 'open'
                ? 'Nothing flagged. The Grievance queue is clear.'
                : 'No reports in this state.'
            }
          />
        )}
        {data.reports.map(r => (
          <ReportRow key={r.id} report={r} onReviewed={refresh} />
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ description }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm text-text-muted">
          <div className="font-semibold text-text-light mb-1">Coming in Phase 3</div>
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlatformAdminConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'overview';

  const setSection = key => {
    const next = new URLSearchParams(searchParams);
    if (key === 'overview') next.delete('section');
    else next.set('section', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <AdminShell
      accent={ACCENT}
      consoleLabel="Platform Admin"
      consoleSublabel="Trust & Safety Console"
      nav={SECTIONS}
      activeKey={activeSection}
      onSelect={setSection}
    >
      <div className="max-w-6xl mx-auto p-6">
        {activeSection === 'overview' && <PlatformOverview onOpenSection={setSection} />}
        {activeSection === 'verifications' && <VerificationsSection />}
        {activeSection === 'reports' && <ReportsSection />}
        {activeSection === 'ugc-care' && (
          <ComingSoon description="Scheduled scraper against ugccare.unipune.ac.in. Auto-flag journals that get delisted between syncs. Manual override table for edge cases (M17)." />
        )}
        {activeSection === 'users' && (
          <ComingSoon description="User management console. Promote/demote roles, view sign-in history, suspend accounts." />
        )}
      </div>
    </AdminShell>
  );
}
