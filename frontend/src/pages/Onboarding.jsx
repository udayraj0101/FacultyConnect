import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Building2,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { previewOnboarding, completeOnboarding } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { getDefaultPathForRole } from '../lib/roleRouting';

export default function Onboarding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    previewOnboarding(token)
      .then(p => {
        if (!cancelled) setPreview(p);
      })
      .catch(err => {
        if (!cancelled) {
          setPreviewError(
            err.response?.data?.error?.message ||
              'This invitation link is invalid or has expired.',
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
    if (!consent) {
      setSubmitError('You must consent to data processing to complete onboarding.');
      return;
    }
    setSubmitting(true);
    try {
      const faculty = await completeOnboarding(token, { password, consent });
      // Force AuthContext to pick up the newly-stored user
      // by calling login… but login needs email/password. Simpler:
      // navigate — App will bootstrap the user from tokenStorage on next
      // render if we do a full nav.
      navigate(getDefaultPathForRole(faculty.role), { replace: true });
      // As a belt-and-suspenders, also trigger a hard reload of the
      // route so any stale AuthProvider state syncs.
      window.location.reload();
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setSubmitError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setSubmitError(err.response?.data?.error?.message || 'Could not complete onboarding.');
      }
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
        to="/"
        className="absolute top-6 left-6 z-10 text-sm font-medium text-text-muted hover:text-text-light inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={16} /> Back to home
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md relative z-1 my-8"
      >
        <Card className="shadow-xl">
          <CardContent className="p-8 md:p-10">
            <div className="text-center mb-6">
              <div className="text-2xl font-extrabold tracking-tight text-secondary mb-1">
                FacultyConnect
              </div>
              <div className="text-xs text-text-muted">Complete your account setup</div>
            </div>

            {loading && (
              <div className="text-sm text-text-muted text-center py-6">
                Checking your invitation…
              </div>
            )}

            {!loading && previewError && (
              <>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{previewError}</AlertDescription>
                </Alert>
                <p className="text-sm text-text-muted text-center pt-4">
                  If you were expecting this invitation, ask the college admin who added you to
                  resend the link.
                </p>
                <p className="text-sm text-text-muted text-center pt-2">
                  Or{' '}
                  <Link to="/signup" className="text-primary font-semibold hover:underline">
                    sign up manually
                  </Link>
                  .
                </p>
              </>
            )}

            {!loading && preview && (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-secondary mb-2">
                    Welcome, {preview.name || 'faculty member'}
                  </h1>
                  <p className="text-sm md:text-base text-text-muted">
                    Set a password to activate your account.
                  </p>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-text-light">
                    <Mail size={13} className="text-primary" />
                    <span className="font-semibold truncate">{preview.email}</span>
                  </div>
                  {preview.institution && (
                    <div className="flex items-center gap-2 text-text-light">
                      <Building2 size={13} className="text-primary" />
                      <span className="truncate">{preview.institution.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 size={13} />
                    <span className="text-[11px]">
                      Pre-verified — you'll be a verified faculty member from day one.
                    </span>
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
                      Choose a password
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
                        placeholder="Re-enter your password"
                        disabled={submitting}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 text-xs text-text-muted p-3 rounded-md bg-muted/60 border border-border">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-primary"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      disabled={submitting}
                    />
                    <span>
                      <ShieldCheck size={12} className="inline text-success mr-1" />I consent to
                      FacultyConnect processing my profile and publication data per the{' '}
                      <strong>DPDP Act 2023</strong>.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    size="lg"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? 'Activating account…' : 'Activate my account'}
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
