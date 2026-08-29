import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Flag } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Alert, AlertDescription } from './ui/Alert';
import { useToast } from './ui/Toast';
import { fileReport, CATEGORY_OPTIONS } from '../services/report.service';

const MAX = 1000;
const MIN = 10;

export default function ReportModal({ targetType, targetId, targetLabel, onClose, onSubmitted }) {
  const { toast } = useToast();
  const [category, setCategory] = useState('predatory_journal');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const remaining = MAX - reason.length;

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (reason.trim().length < MIN) {
      setError(`Please describe the issue in at least ${MIN} characters so the Grievance Officer can act on it.`);
      return;
    }
    setSubmitting(true);
    try {
      const report = await fileReport({
        targetType,
        targetId,
        category,
        reason: reason.trim(),
      });
      toast({
        title: 'Report filed',
        description:
          'The Grievance Officer will acknowledge within 72 hours per IT Rules 2021.',
        variant: 'success',
      });
      onSubmitted?.(report);
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || 'Could not file report.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => (submitting ? null : onClose())}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <Card className="shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-secondary inline-flex items-center gap-2">
                  <Flag size={18} className="text-danger" /> Report this listing
                </h2>
                {targetLabel && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{targetLabel}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-light p-1 rounded"
                disabled={submitting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="reason">What's wrong?</Label>
                  <span
                    className={`text-[11px] tabular-nums ${remaining < 50 ? 'text-danger' : 'text-text-muted'}`}
                  >
                    {remaining}
                  </span>
                </div>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={e => setReason(e.target.value.slice(0, MAX))}
                  rows={5}
                  disabled={submitting}
                  placeholder="Give the Grievance Officer enough detail to investigate — links, dates, names, or specific claims that seem misleading."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="text-[11px] text-text-muted italic">
                Reports are rate-limited to 5 per day. False or malicious reports may result in
                account action. The Grievance Officer will review within 72 hours.
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose} disabled={submitting} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || reason.trim().length < MIN}>
                  <Flag size={14} className="mr-1.5" />
                  {submitting ? 'Filing…' : 'File report'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
