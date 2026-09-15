import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDefaultPathForRole } from '../lib/roleRouting';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Alert, AlertDescription } from '../components/ui/Alert';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from;

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const faculty = await login(email, password);
      navigate(from || getDefaultPathForRole(faculty.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-[#F8FAFC]">
      {/* Ambient background blobs */}
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
        className="w-full max-w-md relative z-1"
      >
        <Card className="shadow-xl">
          <CardContent className="p-8 md:p-10">
            {/* Brand */}
            <div className="text-center mb-8">
              <div className="text-2xl font-extrabold tracking-tight text-secondary mb-1">
                FacultyConnect
              </div>
              <div className="text-xs text-text-muted">
                Academic profile · Opportunities · Collaboration
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-extrabold text-secondary mb-2">
                Welcome to{' '}
                <span
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 100%)',
                  }}
                >
                  FacultyConnect
                </span>
              </h1>
              <p className="text-sm md:text-base text-text-muted">
                Sign in to continue to your dashboard
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-secondary">
                  Email address
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
                    autoComplete="current-password"
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

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>

              <p className="text-sm text-text-muted text-center pt-2">
                No account yet?{' '}
                <Link to="/signup" className="text-primary font-semibold hover:underline">
                  Create one
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
