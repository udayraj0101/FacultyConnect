import React, { useState } from 'react';
import { Upload, UserPlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import SectionCard from '../dashboard/SectionCard';
import { useToast } from '../ui/Toast';
import { inviteFaculty, bulkInviteFaculty } from '../../services/institution.service';

const CSV_MAX_BYTES = 500_000; // 500 KB — 500 invite rows is well under this

/**
 * Very small CSV parser tuned for name,email files. Handles quoted fields
 * (in case a name has a comma) and Windows line endings. We keep it here
 * rather than pulling in papaparse — 30 lines is enough for this use case.
 */
function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    // Split respecting simple quoted-value support
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function normalizeRows(rows) {
  if (!rows.length) return { header: [], invites: [] };
  // If header includes "email", use it — otherwise assume [name, email] order
  const first = rows[0].map(s => s.toLowerCase());
  const hasHeader = first.includes('email') || first.includes('name');
  const startAt = hasHeader ? 1 : 0;

  let emailIdx = 1;
  let nameIdx = 0;
  if (hasHeader) {
    emailIdx = first.indexOf('email');
    nameIdx = first.indexOf('name');
    if (emailIdx === -1) emailIdx = 1;
    if (nameIdx === -1) nameIdx = 0;
  }

  const invites = [];
  for (let i = startAt; i < rows.length; i += 1) {
    const cells = rows[i];
    if (!cells.length) continue;
    const email = cells[emailIdx] || '';
    const name = cells[nameIdx] || '';
    invites.push({ name, email });
  }
  return { header: rows[0], invites };
}

function StatusBadge({ row }) {
  const status = row.status;
  const map = {
    invited: { cls: 'bg-success/10 text-success border-success/30', label: 'Invited' },
    already_member: { cls: 'bg-primary/10 text-primary border-primary/30', label: 'Already member' },
    exists_elsewhere: { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'At another institution' },
    skipped: { cls: 'bg-muted text-text-muted border-border', label: 'Skipped' },
    error: { cls: 'bg-danger/10 text-danger border-danger/30', label: 'Error' },
  };
  // Highlight domain-mismatch skips distinctly from generic skips —
  // admins usually want to review those specifically.
  const isDomainMismatch =
    status === 'skipped' && row.reason === 'domain_mismatch';
  const meta = isDomainMismatch
    ? { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Domain mismatch' }
    : map[status] || map.skipped;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export default function InviteFacultyForm({ onInvited }) {
  const { toast } = useToast();

  // Single-invite form
  const [single, setSingle] = useState({ name: '', email: '' });
  const [singleSubmitting, setSingleSubmitting] = useState(false);
  const [singleError, setSingleError] = useState('');
  // When the backend rejects with DOMAIN_MISMATCH we hold the meta here
  // and surface a confirm-override prompt. Cleared on next successful
  // send or on manual dismissal.
  const [domainWarning, setDomainWarning] = useState(null);

  // CSV import
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvResult, setCsvResult] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [bulkAllowMismatch, setBulkAllowMismatch] = useState(false);

  // Extracted so the "Send anyway" button on the domain-mismatch prompt
  // can re-issue the exact same call with the override flag set.
  const sendInvite = async ({ allowDomainMismatch }) => {
    setSingleSubmitting(true);
    try {
      const r = await inviteFaculty({
        name: single.name,
        email: single.email,
        allowDomainMismatch,
      });
      toast({
        title:
          r.status === 'invited'
            ? 'Invitation sent'
            : r.status === 'already_member'
              ? 'Already on your roster'
              : 'Invite processed',
        description:
          r.status === 'exists_elsewhere'
            ? 'This email is registered at another institution.'
            : r.status === 'invited'
              ? `An onboarding link was emailed to ${single.email}. They stay pending until they claim it.`
              : `${single.email} is already an active member.`,
        variant: r.status === 'exists_elsewhere' ? 'error' : 'success',
      });
      setSingle({ name: '', email: '' });
      setDomainWarning(null);
      onInvited?.();
    } catch (err) {
      const errPayload = err.response?.data?.error;
      if (errPayload?.code === 'DOMAIN_MISMATCH' && errPayload.meta) {
        // Show the confirm-override prompt rather than a raw error banner.
        setDomainWarning(errPayload.meta);
      } else {
        setSingleError(errPayload?.message || 'Could not send invite');
      }
    } finally {
      setSingleSubmitting(false);
    }
  };

  const submitSingle = async e => {
    e.preventDefault();
    setSingleError('');
    setDomainWarning(null);
    if (!single.email) {
      setSingleError('Email is required');
      return;
    }
    await sendInvite({ allowDomainMismatch: false });
  };

  const onCsvFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setCsvError('');
    setCsvResult(null);
    setCsvPreview(null);
    if (!file) return;
    if (file.size > CSV_MAX_BYTES) {
      setCsvError('CSV must be under 500 KB.');
      return;
    }
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const { invites } = normalizeRows(rows);
      if (!invites.length) {
        setCsvError('No rows found in the CSV.');
        return;
      }
      setCsvPreview(invites);
    } catch (err) {
      setCsvError('Could not read CSV file.');
    }
  };

  const submitCsv = async () => {
    if (!csvPreview?.length) return;
    setCsvSubmitting(true);
    setCsvError('');
    try {
      const r = await bulkInviteFaculty(csvPreview, {
        allowDomainMismatch: bulkAllowMismatch,
      });
      setCsvResult(r);
      const mismatchNote = r.summary.domainMismatched
        ? ` · ${r.summary.domainMismatched} skipped for domain mismatch`
        : '';
      toast({
        title: 'Bulk invite complete',
        description:
          `Invited ${r.summary.invited} of ${r.summary.total} · ${r.summary.alreadyMember} already members · ${r.summary.errors} errors` +
          mismatchNote,
        variant: r.summary.errors > 0 ? 'error' : 'success',
      });
      setCsvPreview(null);
      setBulkAllowMismatch(false);
      onInvited?.();
    } catch (err) {
      setCsvError(err.response?.data?.error?.message || 'Bulk invite failed');
    } finally {
      setCsvSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Invite one faculty"
        subtitle="They'll get an email with an onboarding link (valid 7 days) — no admin approval needed once they claim it"
      >
        <form onSubmit={submitSingle} className="space-y-4 max-w-lg">
          {singleError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{singleError}</AlertDescription>
            </Alert>
          )}
          {domainWarning && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 space-y-3">
              <div className="flex items-start gap-2 text-sm text-yellow-900">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Domain mismatch</div>
                  <div className="text-xs mt-0.5 leading-relaxed">
                    The invited email domain (
                    <span className="font-mono font-semibold">
                      {domainWarning.invitedDomain}
                    </span>
                    ) doesn't match your institution's domain (
                    <span className="font-mono font-semibold">
                      {domainWarning.institutionDomain}
                    </span>
                    ). This is often a typo. If the invitee genuinely uses a
                    personal email, confirm below to send anyway — they'll stay
                    pending until they claim the invite.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDomainWarning(null)}
                  disabled={singleSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => sendInvite({ allowDomainMismatch: true })}
                  disabled={singleSubmitting}
                >
                  {singleSubmitting ? 'Sending…' : 'Send anyway'}
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name (optional)</Label>
              <Input
                id="invite-name"
                value={single.name}
                onChange={e => setSingle(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. R. Kumar"
                disabled={singleSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Institutional email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={single.email}
                onChange={e => setSingle(prev => ({ ...prev, email: e.target.value }))}
                placeholder="rkumar@iitm.ac.in"
                disabled={singleSubmitting}
              />
            </div>
          </div>
          <Button type="submit" disabled={singleSubmitting} className="min-w-[160px]">
            {singleSubmitting ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <UserPlus size={14} className="mr-2" />
                Send invitation
              </>
            )}
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Bulk-invite via CSV"
        subtitle="Two-column file: name, email. Header row optional. Max 500 invites per batch."
      >
        <div className="space-y-4">
          {csvError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{csvError}</AlertDescription>
            </Alert>
          )}

          <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border-2 border-dashed border-border bg-muted/40 hover:border-primary/40 hover:bg-primary/5 transition-colors px-5 py-4 text-sm text-text-light">
            <Upload size={16} className="text-primary" />
            <span className="font-semibold">Choose CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onCsvFile}
              disabled={csvSubmitting}
              className="sr-only"
            />
          </label>

          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer font-semibold hover:text-text-light">
              Show CSV format
            </summary>
            <pre className="mt-2 rounded-md bg-muted/60 border border-border p-3 font-mono text-[11px] overflow-x-auto">
{`name,email
Dr. R. Kumar,rkumar@iitm.ac.in
Prof. S. Iyer,siyer@iitm.ac.in
Dr. A. Menon,amenon@iitm.ac.in`}
            </pre>
          </details>

          {csvPreview && (
            <div className="rounded-md border border-border bg-white">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-text-light">
                  <span className="font-semibold">{csvPreview.length}</span> row
                  {csvPreview.length === 1 ? '' : 's'} ready to invite
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkAllowMismatch}
                      onChange={e => setBulkAllowMismatch(e.target.checked)}
                      disabled={csvSubmitting}
                      className="accent-primary"
                    />
                    Allow non-institutional domains
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCsvPreview(null)}
                    disabled={csvSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={submitCsv} disabled={csvSubmitting}>
                    {csvSubmitting ? (
                      <>
                        <Loader2 size={13} className="mr-1.5 animate-spin" />
                        Sending {csvPreview.length}…
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} className="mr-1.5" />
                        Send {csvPreview.length} invites
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-text-muted uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvPreview.slice(0, 100).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{r.name || <span className="text-text-muted italic">—</span>}</td>
                        <td className="px-3 py-1.5 font-mono">{r.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvPreview.length > 100 && (
                  <div className="text-[11px] text-text-muted px-3 py-2 border-t border-border">
                    Showing first 100 of {csvPreview.length}. All rows will be sent.
                  </div>
                )}
              </div>
            </div>
          )}

          {csvResult && (
            <div className="rounded-md border border-border bg-white">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-bold text-text-light flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Bulk invite complete
                </div>
                <div className="text-xs text-text-muted mt-1 flex gap-4 flex-wrap">
                  <span>
                    <strong className="text-text-light">{csvResult.summary.invited}</strong> invited
                  </span>
                  <span>
                    <strong className="text-text-light">{csvResult.summary.alreadyMember}</strong>{' '}
                    already members
                  </span>
                  <span>
                    <strong className="text-text-light">{csvResult.summary.existsElsewhere}</strong>{' '}
                    elsewhere
                  </span>
                  <span>
                    <strong className="text-text-light">{csvResult.summary.skipped}</strong>{' '}
                    skipped
                  </span>
                  <span>
                    <strong className="text-text-light">{csvResult.summary.errors}</strong> errors
                  </span>
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-text-muted uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="text-left px-3 py-2">Email</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvResult.results.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-mono">{r.email || '—'}</td>
                        <td className="px-3 py-1.5">
                          <StatusBadge row={r} />
                        </td>
                        <td className="px-3 py-1.5 text-text-muted">
                          {r.message || r.reason || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
