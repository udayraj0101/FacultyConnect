import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, CalendarClock, ClipboardList, Pencil, Trash2, ArchiveRestore } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonList } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import { listMyPostings, setJobStatus, deleteJob, getJob } from '../../services/job.service';
import PostJobForm from './PostJobForm';

function daysUntil(deadline) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function StatusPill({ status }) {
  const styles = {
    open: 'bg-success/10 text-success border-success/30',
    closed: 'bg-muted text-text-muted border-border',
    archived: 'bg-danger/10 text-danger border-danger/30',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
        styles[status] || styles.closed
      }`}
    >
      {status}
    </span>
  );
}

function PipelineDots({ counts }) {
  const items = [
    { key: 'applied', label: 'Applied', cls: 'bg-primary/15 text-primary' },
    { key: 'shortlisted', label: 'Short', cls: 'bg-yellow-100 text-yellow-700' },
    { key: 'interview', label: 'Interview', cls: 'bg-accent/15 text-accent' },
    { key: 'closed', label: 'Closed', cls: 'bg-muted text-text-muted' },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.map(it => (
        <span
          key={it.key}
          title={it.label}
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${it.cls}`}
        >
          <span className="hidden sm:inline">{it.label.slice(0, 1)}</span>
          <span className="tabular-nums">{counts?.[it.key] ?? 0}</span>
        </span>
      ))}
    </div>
  );
}

function DeadlineText({ deadline }) {
  const days = daysUntil(deadline);
  const past = days < 0;
  const urgent = !past && days <= 7;
  return (
    <div>
      <div className="text-xs text-text-muted">
        {new Date(deadline).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </div>
      <div className={`text-[11px] ${past ? 'text-danger' : urgent ? 'text-danger' : 'text-text-muted'}`}>
        {past ? 'closed' : `${days} day${days === 1 ? '' : 's'} left`}
      </div>
    </div>
  );
}

function JobRowActions({ job, busy, onOpenApplicants, onToggle, onEdit, onDelete }) {
  const archived = job.status === 'archived';
  return (
    <div className="flex flex-col sm:flex-row md:flex-col gap-1 min-w-[120px]">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onOpenApplicants?.(job.id)}
        disabled={busy}
      >
        View applicants
      </Button>
      {!archived && (
        <Button size="sm" variant="outline" onClick={() => onEdit(job)} disabled={busy}>
          <Pencil size={12} className="mr-1" />
          Edit
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onToggle(job)}
        disabled={busy}
        className={
          archived
            ? 'border-primary/40 text-primary hover:bg-primary/5'
            : job.status === 'open'
              ? 'border-danger/40 text-danger hover:bg-danger/5'
              : ''
        }
      >
        {busy
          ? '…'
          : archived
            ? (
                <>
                  <ArchiveRestore size={12} className="mr-1" />
                  Restore
                </>
              )
            : job.status === 'open'
              ? 'Close job'
              : 'Reopen'}
      </Button>
      {!archived && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(job)}
          disabled={busy}
          className="border-danger/40 text-danger hover:bg-danger/5"
        >
          <Trash2 size={12} className="mr-1" />
          Archive
        </Button>
      )}
    </div>
  );
}

export default function MyJobsList({ onOpenApplicants }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  // Full job doc being edited (fetched via getJob so we get description
  // + qualifications, which the aggregate roster query strips out).
  const [editingJob, setEditingJob] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  // Confirm-delete state; { id, hasApps } so we can warn before archiving.
  const [confirmDelete, setConfirmDelete] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listMyPostings();
      setJobs(list);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load your postings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async job => {
    if (busyId) return;
    setBusyId(job.id);
    // Archived → restore path opens the posting again; open ↔ closed
    // path toggles as before. Keeps the same button call site.
    const nextStatus =
      job.status === 'archived' ? 'open' : job.status === 'open' ? 'closed' : 'open';
    try {
      await setJobStatus(job.id, nextStatus);
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: nextStatus } : j)));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update job status');
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = async job => {
    setEditLoading(true);
    setError('');
    try {
      // Fetch the full doc — the roster aggregate omits qualifications +
      // description which we need in the edit form.
      const full = await getJob(job.id);
      setEditingJob(full);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load posting for edit');
    } finally {
      setEditLoading(false);
    }
  };

  const onEditSaved = updated => {
    setJobs(prev =>
      prev.map(j =>
        j.id === updated.id
          ? {
              ...j,
              title: updated.title,
              department: updated.department,
              designation: updated.designation,
              location: updated.location,
              deadline: updated.deadline,
            }
          : j,
      ),
    );
    setEditingJob(null);
  };

  const doDelete = async job => {
    setBusyId(job.id);
    setError('');
    try {
      await deleteJob(job.id);
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: 'archived' } : j)));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not archive posting');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionCard
      title="My postings"
      subtitle="All jobs at your institution. Close a job to stop accepting new applications."
      trailing={
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {editingJob && (
        <div className="mb-6 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <PostJobForm
            editJob={editingJob}
            onSaved={onEditSaved}
            onCancel={() => setEditingJob(null)}
          />
        </div>
      )}

      {confirmDelete && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 p-4 flex items-start justify-between gap-3">
          <div className="text-sm text-text-light">
            <div className="font-semibold text-danger">Archive this posting?</div>
            <p className="text-xs text-text-muted mt-1 max-w-lg">
              <span className="font-semibold">{confirmDelete.title}</span> will be moved to
              archived status. Existing applications stay attached and applicants keep
              access to their submission history. You can restore it later.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-danger hover:bg-danger/90 text-white"
              onClick={() => doDelete(confirmDelete)}
              disabled={busyId === confirmDelete.id}
            >
              {busyId === confirmDelete.id ? 'Archiving…' : 'Archive'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList count={3} cardLines={2} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={20} />}
          title="No jobs posted yet"
          description="Use the Post Job tab to publish your first opening."
        />
      ) : (
        <>
          {/* Desktop table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Designation</th>
                  <th className="py-2 pr-4">Deadline</th>
                  <th className="py-2 pr-4">Pipeline</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-border last:border-none align-top">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-text-light">{job.title}</div>
                      <div className="text-xs text-text-muted">{job.department}</div>
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{job.designation}</td>
                    <td className="py-3 pr-4 text-text-muted">
                      <DeadlineText deadline={job.deadline} />
                    </td>
                    <td className="py-3 pr-4">
                      <PipelineDots counts={job.counts} />
                      <div className="text-[11px] text-text-muted mt-1">
                        {job.applicantsCount} total
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={job.status} />
                    </td>
                    <td className="py-3 pr-4">
                      <JobRowActions
                        job={job}
                        busy={busyId === job.id || editLoading}
                        onOpenApplicants={onOpenApplicants}
                        onToggle={toggle}
                        onEdit={openEdit}
                        onDelete={j => setConfirmDelete(j)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card variant (<md) */}
          <div className="md:hidden space-y-3">
            {jobs.map(job => (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-text-light leading-tight">{job.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {job.department} · {job.designation}
                    </div>
                  </div>
                  <StatusPill status={job.status} />
                </div>

                <div className="flex items-center gap-4 flex-wrap text-xs text-text-muted">
                  <div className="inline-flex items-center gap-1.5">
                    <CalendarClock size={12} />
                    <DeadlineText deadline={job.deadline} />
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <ClipboardList size={12} />
                    <span>{job.applicantsCount} total</span>
                  </div>
                </div>

                <PipelineDots counts={job.counts} />

                <JobRowActions
                  job={job}
                  busy={busyId === job.id || editLoading}
                  onOpenApplicants={onOpenApplicants}
                  onToggle={toggle}
                  onEdit={openEdit}
                  onDelete={j => setConfirmDelete(j)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
