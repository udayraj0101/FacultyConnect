import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultPathForRole } from '../lib/roleRouting';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { listInstitutions } from '../services/institution.service';

const DESIGNATIONS = ['Assistant', 'Associate', 'Professor', 'Guest', 'Research'];

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    designation: 'Assistant',
    institutionId: '',
    consent: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listInstitutions({ verifiedOnly: 'true', limit: 100 });
        if (!cancelled) setInstitutions(res.institutions || []);
      } catch {
        /* non-fatal — the dropdown will just be empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.consent) {
      setError('You must consent to data processing to create an account (DPDP Act 2023).');
      return;
    }
    setSubmitting(true);
    try {
      const faculty = await signup(form);
      navigate(getDefaultPathForRole(faculty.role), { replace: true });
    } catch (err) {
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map(d => `${d.path}: ${d.message}`).join(' · '));
      } else {
        setError(err.response?.data?.error?.message || 'Signup failed. Please try again.');
      }
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
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-15%',
          right: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,184,148,0.07) 0%, transparent 70%)',
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
              <div className="text-xs text-text-muted">
                Academic profile · Opportunities · Collaboration
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-secondary mb-2">
                Create your{' '}
                <span
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 100%)',
                  }}
                >
                  account
                </span>
              </h1>
              <p className="text-sm md:text-base text-text-muted">
                Faculty at an Indian college or university.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-secondary">
                  Full name
                </Label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Dr. Priya Sharma"
                    disabled={submitting}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-secondary">
                  Institutional email
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
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="you@iit.ac.in"
                    disabled={submitting}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-secondary">
                  Password
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
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
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
                <Label htmlFor="designation" className="text-sm font-medium text-secondary">
                  Designation
                </Label>
                <select
                  id="designation"
                  value={form.designation}
                  onChange={e => update('designation', e.target.value)}
                  disabled={submitting}
                  className="flex h-10 w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {DESIGNATIONS.map(d => (
                    <option key={d} value={d}>
                      {d} Professor
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institution" className="text-sm font-medium text-secondary">
                  Institution
                </Label>
                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    id="institution"
                    value={form.institutionId}
                    onChange={e => update('institutionId', e.target.value)}
                    disabled={submitting}
                    className="flex h-10 w-full rounded-lg border border-border bg-white pl-10 pr-3 py-2 text-sm text-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">Not affiliated / add later</option>
                    {institutions.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                {form.institutionId && (
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Your account will be marked <strong>pending</strong> until the college admin
                    approves your affiliation. You can browse the platform while you wait.
                  </p>
                )}
              </div>

              <label className="flex items-start gap-2 text-xs text-text-muted p-3 rounded-md bg-muted/60 border border-border">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={form.consent}
                  onChange={e => update('consent', e.target.checked)}
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
                {submitting ? 'Creating account…' : 'Create account'}
              </Button>

              <p className="text-sm text-text-muted text-center pt-1">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
