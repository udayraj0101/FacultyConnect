import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { requestPasswordReset } from '../services/auth.service';

/**
 * Faculty starts the reset flow here. The API returns a uniform success
 * message whether or not the email is registered — we mirror that in the
 * UI so an attacker can't enumerate accounts. The user sees the same
 * "check your email" screen regardless.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      // Only surface transport / validation errors — the backend always
      // returns 200 for the success path so we shouldn't hit this for the
      // "unknown email" case.
      setError(
        err.response?.data?.error?.message ||
          'Could not send reset email. Please try again in a few minutes.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-[#F8FAFC]">
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%',
          left: '-10%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,92,231,0.10) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      <Link
        to="/login"
        className="absolute top-6 left-6 z-10 text-sm font-medium text-text-muted hover:text-text-light inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md relative z-1"
      >
        <Card className="shadow-xl">
          <CardContent className="p-8 md:p-10">
            <div className="text-center mb-6">
              <div className="text-2xl font-extrabold tracking-tight text-secondary mb-1">
                FacultyConnect
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-secondary mt-4">
                Reset your password
              </h1>
              <p className="text-sm text-text-muted mt-2">
                Enter the email you sign in with and we&apos;ll email you a link to choose a new
                password.
              </p>
            </div>

            {sent ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-text-light">
                      Check your inbox
                    </div>
                    <div className="text-xs text-text-muted mt-1 leading-relaxed">
                      If an account exists for <span className="font-semibold">{email}</span>,
                      we&apos;ve sent a reset link. It expires in 1 hour. Check your spam folder
                      if you don&apos;t see it in a couple of minutes.
                    </div>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full h-11 rounded-md border border-border bg-white hover:bg-muted text-text-light text-sm font-medium transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-secondary">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@institution.ac.in"
                      disabled={submitting}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  disabled={submitting || !email.trim()}
                  aria-busy={submitting}
                >
                  {submitting ? 'Sending…' : 'Send reset link'}
                </Button>

                <p className="text-sm text-text-muted text-center pt-2">
                  Remembered it?{' '}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
