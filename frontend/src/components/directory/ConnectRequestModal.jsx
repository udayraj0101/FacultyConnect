import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { useToast } from '../ui/Toast';
import { sendConnectRequest, PURPOSE_OPTIONS } from '../../services/connectRequest.service';

const MAX = 300;

export default function ConnectRequestModal({ toFaculty, onClose, onSent }) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState('co_author');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const remaining = MAX - message.length;

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const request = await sendConnectRequest({
        toFacultyId: toFaculty.id,
        purpose,
        message: message.trim(),
      });
      toast({
        title: 'Request sent',
        description: `${toFaculty.name} will see it in their inbox.`,
        variant: 'success',
      });
      onSent?.(request);
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || 'Could not send request.');
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
                <h2 className="text-lg font-bold text-secondary">Send connect request</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  To <span className="font-semibold text-text-light">{toFaculty.name}</span>
                  {toFaculty.institution?.name ? ` · ${toFaculty.institution.name}` : ''}
                </p>
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
                <Label htmlFor="purpose">Purpose</Label>
                <select
                  id="purpose"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PURPOSE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="message">Message</Label>
                  <span
                    className={`text-[11px] tabular-nums ${remaining < 20 ? 'text-danger' : 'text-text-muted'}`}
                  >
                    {remaining}
                  </span>
                </div>
                <textarea
                  id="message"
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, MAX))}
                  rows={5}
                  disabled={submitting}
                  placeholder="Introduce yourself briefly and explain what kind of collaboration you have in mind."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="text-[11px] text-text-muted italic">
                Their contact email stays hidden until they accept. Please keep it professional —
                requests are rate-limited to prevent spam.
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose} disabled={submitting} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || message.trim().length < 10}>
                  <Send size={14} className="mr-1.5" />
                  {submitting ? 'Sending…' : 'Send request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
