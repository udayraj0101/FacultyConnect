import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { previewPasswordReset, completePasswordReset } from '../services/auth.service';

/**
 * Landing page for the reset link in the email. Validates the token on
 * mount (shows the target email as reassurance), then lets the user set
 * a new password. On success it does NOT auto-log-in — a password reset
 * is often triggered by a security concern, so we want the user to
 * consciously sign in with the new password rather than land in an
 * already-authenticated session.
 */
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    previewPasswordReset(token)
      .then(data => {
        if (!cancelled) setPreview(data);
      })
      .catch(err => {
        if (!cancelled) {
          setPreviewError(
            err.response?.data?.error?.message ||
              'This reset link is invalid or has expired.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async e => {
    e.preventDefault();
    setSubmitError('');
    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await completePasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setSubmitError(
        err.response?.data?.error?.message || 'Could not reset password. Please try again.',
      );
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
              <div className="text-xs text-text-muted mt-1">Choose a new password</div>
            </div>

            {loading && (
              <div className="text-sm text-text-muted text-center py-6">
                Checking your reset link…
              </div>
            )}

            {!loading && previewError && (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{previewError}</AlertDescription>
                </Alert>
                <div className="text-sm text-text-muted text-center pt-4">
                  Reset links expire after 1 hour and only work once. If yours has expired,
                  request a new one.
                </div>
                <div className="pt-4">
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center justify-center w-full h-11 rounded-md bg-primary text-white hover:bg-primary/90 text-sm font-medium transition-colors"
                  >
                    Request new reset link
                  </Link>
                </div>
              </>
            )}

            {!loading && preview && done && (
              <div className="space-y-4">
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-text-light">
                      Password reset
                    </div>
                    <div className="text-xs text-text-muted mt-1 leading-relaxed">
                      You can now sign in with your new password. Any active sessions on your
                      account have been ended for security.
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Sign in
                </Button>
              </div>
            )}

            {!loading && preview && !done && (
              <>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 text-xs">
                  <div className="flex items-center gap-2 text-text-light">
                    <Mail size={13} className="text-primary" />
                    <span className="font-semibold truncate">{preview.email}</span>
                  </div>
                  <div className="text-text-muted mt-1 text-[11px]">
                    Choosing a new password will sign out any active sessions on your account.
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  {submitError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-secondary">
                      New password
                    </Label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                        aria-hidden="true"
                      />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        disabled={submitting}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        disabled={submitting}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm" className="text-sm font-medium text-secondary">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                        aria-hidden="true"
                      />
                      <Input
                        id="confirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        disabled={submitting}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    size="lg"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? 'Setting password…' : 'Set new password'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
