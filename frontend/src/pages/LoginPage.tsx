import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    loginAsJudge,
    isFirebaseReady,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleJudgeLogin = () => {
    loginAsJudge();
    navigate('/dashboard');
  };

  const handleGoogleLogin = async () => {
    try {
      setSubmitting(true);
      await loginWithGoogle();
      navigate('/dashboard');
    } catch {
      // Error handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signupWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/dashboard');
    } catch {
      // Error handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-neutral-surface border-2 border-neutral-ink p-8 shadow-hard space-y-8">
        {/* Header */}
        <div className="space-y-2 border-b-2 border-neutral-border pb-6">
          <h1 className="text-3xl font-bold text-neutral-ink">Access Workspace</h1>
          <p className="text-base text-neutral-muted">
            Authenticate to manage documents, execute agent traces, and run queries.
          </p>
        </div>

        {/* 1-Click Judge Mode Card (Essential for Hackathon Judges) */}
        <div className="bg-neutral-bg border-2 border-secondary p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold text-neutral-ink">Judge & Evaluation Mode</h2>
          </div>
          <p className="text-sm text-neutral-ink leading-relaxed">
            One-click evaluator access. Bypasses external network calls, captcha, and email verification for direct live presentations.
          </p>
          <button
            type="button"
            onClick={handleJudgeLogin}
            className="w-full py-3.5 px-4 bg-secondary text-secondary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-secondary-hover active:translate-x-0.5 active:translate-y-0.5"
          >
            Enter as Judge (1-Click Instant Access)
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t-2 border-neutral-border w-full"></div>
          <span className="bg-neutral-surface px-4 text-sm font-bold text-neutral-muted uppercase tracking-wider absolute">
            Or Standard Auth
          </span>
        </div>

        {/* Firebase Configuration Notice */}
        {!isFirebaseReady && (
          <div className="p-4 bg-neutral-bg border-2 border-neutral-border text-sm text-neutral-ink flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Firebase keys not set in frontend/.env</span>
              <span>
                Standard login will automatically fall back to Demo Mode until you paste your Firebase credentials into frontend/.env.
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-neutral-bg border-2 border-signal text-sm text-neutral-ink flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-signal" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-sm font-bold text-neutral-ink underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="w-full py-3 px-4 bg-neutral-surface text-neutral-ink text-base font-semibold border-2 border-neutral-border hover:bg-neutral-bg active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-neutral-ink">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full h-12 pl-10 pr-4 text-base bg-neutral-surface border-2 border-neutral-border text-neutral-ink focus:border-primary"
                />
                <User className="w-5 h-5 text-neutral-muted absolute left-3 top-3.5" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-neutral-ink">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@somaiya.edu"
                className="w-full h-12 pl-10 pr-4 text-base bg-neutral-surface border-2 border-neutral-border text-neutral-ink focus:border-primary"
              />
              <Mail className="w-5 h-5 text-neutral-muted absolute left-3 top-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-neutral-ink">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-10 pr-4 text-base bg-neutral-surface border-2 border-neutral-border text-neutral-ink focus:border-primary"
              />
              <Lock className="w-5 h-5 text-neutral-muted absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-primary text-primary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5 mt-2"
          >
            {submitting ? 'Authenticating...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="text-center pt-2 border-t border-neutral-border">
          {mode === 'signin' ? (
            <p className="text-sm text-neutral-muted">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-bold text-neutral-ink underline hover:text-primary"
              >
                Create one now
              </button>
            </p>
          ) : (
            <p className="text-sm text-neutral-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-bold text-neutral-ink underline hover:text-primary"
              >
                Sign in instead
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
