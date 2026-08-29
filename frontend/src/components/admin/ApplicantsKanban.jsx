import React, { useEffect, useState } from 'react';
import { KanbanSquare } from 'lucide-react';
import SectionCard from '../dashboard/SectionCard';
import EmptyState from '../ui/EmptyState';
import { Alert, AlertDescription } from '../ui/Alert';
import { listJobs, listApplicants, updateApplicationStatus } from '../../services/job.service';

const COLUMNS = [
  { key: 'applied', label: 'Applied', tone: 'bg-primary/5 border-primary/20' },
  { key: 'shortlisted', label: 'Shortlisted', tone: 'bg-yellow-50 border-yellow-200' },
  { key: 'interview', label: 'Interview', tone: 'bg-accent/5 border-accent/20' },
  { key: 'closed', label: 'Closed', tone: 'bg-muted border-border' },
];

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

function ApplicantCard({ application, jobId, onMoved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fac = application.faculty;

  const move = async newStatus => {
    if (newStatus === application.status || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await updateApplicationStatus(jobId, application.id, { status: newStatus });
      onMoved(updated);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Move failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-border rounded-lg p-3 shadow-sm space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
          {initialsOf(fac?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-text-light truncate">
            {fac?.name || '(unknown)'}
          </div>
          <div className="text-xs text-text-muted truncate">
            {fac?.designation === 'Professor'
              ? 'Professor'
              : `${fac?.designation || ''} Professor`.trim()}
          </div>
        </div>
        {fac?.orcidId && (
          <a
            href={`https://sandbox.orcid.org/${fac.orcidId}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary underline shrink-0"
          >
            ORCID
          </a>
        )}
      </div>

      {fac?.domainTags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fac.domainTags.slice(0, 3).map(t => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 border border-primary/10"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="text-[11px] text-text-muted">
        {typeof fac?.citationCount === 'number' && (
          <>
            Citations {fac.citationCount} · h {fac.hIndex}
          </>
        )}
      </div>
      <div className="text-[11px] text-text-muted">
        Applied {new Date(application.appliedAt).toLocaleDateString()}
      </div>

      {error && <div className="text-[11px] text-danger">{error}</div>}

      <select
        value={application.status}
        onChange={e => move(e.target.value)}
        disabled={busy}
        className="w-full text-xs rounded-md border border-border bg-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {COLUMNS.map(c => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ApplicantsKanban({ initialJobId = '' }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await listJobs({ include_expired: 'true', limit: 50 });
        if (cancelled) return;
        setJobs(result.jobs);
        if (!selectedJobId && result.jobs[0]) setSelectedJobId(result.jobs[0].id);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Could not load jobs');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialJobId && initialJobId !== selectedJobId) setSelectedJobId(initialJobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJobId]);

  useEffect(() => {
    if (!selectedJobId) return;
    let cancelled = false;
    setLoading(true);
    listApplicants(selectedJobId)
      .then(result => {
        if (!cancelled) setApplications(result.applications);
      })
      .catch(err => {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load applicants');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedJobId]);

  const onMoved = updated => {
    setApplications(prev => prev.map(a => (a.id === updated.id ? updated : a)));
  };

  const groupedByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = applications.filter(a => a.status === col.key);
    return acc;
  }, {});

  const jobSelector = (
    <div className="flex items-center gap-2">
      <label htmlFor="job-select" className="text-xs uppercase text-text-muted font-semibold">
        Job
      </label>
      <select
        id="job-select"
        value={selectedJobId}
        onChange={e => setSelectedJobId(e.target.value)}
        className="text-sm rounded-md border border-border bg-white px-2 py-1 min-w-[220px] max-w-[280px] truncate"
      >
        <option value="">Select a job</option>
        {jobs.map(j => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <SectionCard
      title="Applicant pipeline"
      subtitle="Move applicants across stages by changing the status on their card."
      trailing={jobSelector}
    >
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedJobId ? (
        <EmptyState
          icon={<KanbanSquare size={20} />}
          title={jobs.length === 0 ? 'No jobs yet' : 'Select a job'}
          description={
            jobs.length === 0
              ? 'Use the Post Job tab to create your first opening.'
              : 'Pick a job from the dropdown above to see its applicant pipeline.'
          }
        />
      ) : loading ? (
        <div className="text-sm text-text-muted">Loading applicants…</div>
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare size={20} />}
          title="No applications yet"
          description="When faculty apply to this posting, they'll appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map(col => (
            <div key={col.key} className={`rounded-lg border p-3 space-y-2 ${col.tone}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  {col.label}
                </div>
                <span className="text-xs font-semibold text-text-muted tabular-nums bg-white/60 rounded-full px-2 py-0.5">
                  {groupedByStatus[col.key].length}
                </span>
              </div>
              {groupedByStatus[col.key].map(app => (
                <ApplicantCard
                  key={app.id}
                  application={app}
                  jobId={selectedJobId}
                  onMoved={onMoved}
                />
              ))}
              {groupedByStatus[col.key].length === 0 && (
                <div className="text-[11px] text-text-muted italic py-2 text-center">
                  No applicants here
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
