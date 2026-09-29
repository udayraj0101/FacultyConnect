import React, { useState } from 'react';
import { Download, ShieldCheck, AlertTriangle, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import {
  downloadMyData,
  requestAccountErasure,
  cancelAccountErasure,
} from '../../services/faculty.service';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * DPDP Act 2023 self-service tools:
 *   - Download my data (right to portability): triggers a JSON file
 *     download containing everything the platform holds for the user.
 *   - Delete my account (right to erasure): schedules deletion 7 days
 *     out; nightly scheduler hard-deletes past-due accounts. Cancelable
 *     during the grace period.
 *   - Consent audit: shows when the user accepted which policy version.
 *
 * When the account is already scheduled for deletion, the card
 * suppresses the primary destructive action and surfaces a big red
 * banner + Cancel button so accidental deletions are recoverable.
 */
export default function DpdpToolsCard({ faculty, onErasureChange, onError }) {
  const [downloading, setDownloading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isScheduled = Boolean(faculty?.deletionScheduledFor);
  const scheduledDate = formatDate(faculty?.deletionScheduledFor);
  // Legacy accounts pre-date the consent-timestamp audit — fall back
  // to createdAt with an "at account creation" note so the record is
  // never a jarring empty dash.
  const explicitConsent = formatDate(faculty?.consentAcceptedAt);
  const inferredConsent = faculty?.createdAt
    ? `${formatDate(faculty.createdAt)} — at account creation`
    : null;
  const consentDate = explicitConsent || inferredConsent;

  const onDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadMyData();
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Data export failed');
    } finally {
      setDownloading(false);
    }
  };

  const onRequestDelete = async () => {
    if (scheduling) return;
    setScheduling(true);
    try {
      await requestAccountErasure();
      setConfirmingDelete(false);
      onErasureChange?.();
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Could not schedule deletion');
    } finally {
      setScheduling(false);
    }
  };

  const onCancelDelete = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelAccountErasure();
      onErasureChange?.();
    } catch (err) {
      onError?.(err.response?.data?.error?.message || 'Could not cancel deletion');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            Privacy & data (DPDP Act 2023)
          </div>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            You have a right to a copy of everything we store about you, and to have your
            account deleted. Both are self-service below.
          </p>
        </div>

        {isScheduled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              <div className="font-semibold">
                Account deletion scheduled for {scheduledDate}
              </div>
              <div className="text-xs mt-1">
                Your account and all data we hold about you (profile, publications,
                applications, saved searches, notifications, connect requests) will be
                permanently deleted on that date. You can cancel at any time before then.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Consent audit */}
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
            Consent record
          </div>
          <div className="text-sm text-text-light mt-1">
            You accepted the privacy policy on{' '}
            <span className="font-semibold">{consentDate || '—'}</span>
            {faculty?.consentPolicyVersion && (
              <span className="text-text-muted">
                {' '}
                (version {faculty.consentPolicyVersion})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" /> Preparing…
              </>
            ) : (
              <>
                <Download size={14} className="mr-1.5" /> Download my data
              </>
            )}
          </Button>

          {isScheduled ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancelDelete}
              disabled={cancelling}
              className="border-primary/40 text-primary hover:bg-primary/5"
            >
              {cancelling ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> Cancelling…
                </>
              ) : (
                <>
                  <RotateCcw size={14} className="mr-1.5" /> Cancel deletion
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(true)}
              className="border-danger/40 text-danger hover:bg-danger/5"
            >
              <Trash2 size={14} className="mr-1.5" /> Delete my account…
            </Button>
          )}
        </div>

        {confirmingDelete && !isScheduled && (
          <div className="rounded-md border-2 border-danger/40 bg-danger/5 p-4 space-y-2">
            <div className="text-sm font-semibold text-danger flex items-center gap-2">
              <AlertTriangle size={14} /> Delete your FacultyConnect account?
            </div>
            <p className="text-xs text-text-light leading-relaxed">
              Deletion is scheduled 7 days out — that gives you time to change your mind
              (just come back here and cancel). After that, your profile, publications,
              applications, saved searches, notifications, and connect requests are all
              permanently removed. This can't be undone once the grace period elapses.
            </p>
            <p className="text-xs text-text-muted">
              We recommend downloading your data first (button above).
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={scheduling}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onRequestDelete}
                disabled={scheduling}
                className="bg-danger hover:bg-danger/90 text-white"
              >
                {scheduling ? (
                  <>
                    <Loader2 size={12} className="mr-1 animate-spin" /> Scheduling…
                  </>
                ) : (
                  <>Schedule deletion in 7 days</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
