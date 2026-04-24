"use client";

import React from 'react';
import Link from 'next/link';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getSafeNextPathFromSearch } from '@/utils/redirectPath';
import BrandLogo from '@/components/BrandLogo';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGN_IN_FAILURE_MESSAGE = 'Unable to sign in. Check your email and password, then try again.';
const SIGN_UP_FAILURE_MESSAGE = 'Unable to create account. Check your details and try again.';
const SIGN_UP_NEXT_STEPS_MESSAGE =
  'If this email can create an account, check your inbox for next steps.';
const RESET_FAILURE_MESSAGE = 'Unable to send reset email right now. Please try again later.';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [mode, setMode] = React.useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const safeNext = getSafeNextPathFromSearch(window.location.search);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    if (mode === 'sign-in') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) {
        setError(SIGN_IN_FAILURE_MESSAGE);
        setLoading(false);
        return;
      }

      router.push(safeNext);
      router.refresh();
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password
    });

    if (signUpError) {
      setError(SIGN_UP_FAILURE_MESSAGE);
      setLoading(false);
      return;
    }

    const isExistingUser = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
    if (isExistingUser) {
      setMessage(SIGN_UP_NEXT_STEPS_MESSAGE);
      setMode('sign-in');
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push(safeNext);
      router.refresh();
      return;
    }

    setMessage(SIGN_UP_NEXT_STEPS_MESSAGE);
    setMode('sign-in');
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setMessage(null);

    if (!normalizedEmail) {
      setError('Enter your email first, then click "Forgot password?".');
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSendingReset(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo
    });

    if (resetError) {
      setError(RESET_FAILURE_MESSAGE);
      setIsSendingReset(false);
      return;
    }

    setMessage('If an account exists for this email, a reset link has been sent.');
    setIsSendingReset(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-900 text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgb(var(--surface-700)_/_0.5),transparent_35%),radial-gradient(circle_at_85%_12%,rgb(var(--accent)_/_0.12),transparent_30%),linear-gradient(135deg,rgb(var(--surface-900))_0%,rgb(var(--surface-800))_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-500/50 to-transparent" />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-4 pt-4 sm:px-6 md:px-8 md:pt-6">
          <Link
            href="/landing"
            className="pointer-events-auto rounded-2xl border border-surface-600/60 bg-surface-900/70 px-4 py-3 backdrop-blur-xl transition-colors hover:border-surface-500/70"
          >
            <BrandLogo className="h-10 w-auto" priority />
          </Link>

          <Link
            href="/landing"
            className="pointer-events-auto inline-flex h-10 items-center rounded-xl border border-surface-600/60 bg-surface-900/70 px-4 text-xs font-medium text-text-secondary backdrop-blur-xl transition-colors hover:border-surface-500 hover:bg-surface-800 hover:text-text-primary"
          >
            Back to landing
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-24 sm:px-6 md:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
          <section className="rounded-[2rem] border border-surface-600/70 bg-surface-900/55 px-6 py-8 backdrop-blur-xl sm:px-8 md:py-10">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Sign in to keep creating.
            </h1>
            <p className="mt-4 max-w-lg text-sm text-text-secondary sm:text-base">
              Access your saved generations, account settings, and model preferences in one workspace.
            </p>
          </section>

          <section className="rounded-[1.75rem] border border-surface-600/70 bg-surface-800/70 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-8">
            <h2 className="text-xl font-medium">Login Required</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in with your Supabase account to generate and save MIDI compositions.
            </p>

            <div className="mt-5 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('sign-in');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 rounded-xl border py-2 transition-colors ${
                  mode === 'sign-in'
                    ? 'border-accent text-accent'
                    : 'border-surface-600 text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('sign-up');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 rounded-xl border py-2 transition-colors ${
                  mode === 'sign-up'
                    ? 'border-accent text-accent'
                    : 'border-surface-600 text-text-secondary hover:text-text-primary'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                autoComplete="email"
                disabled={loading}
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || isSendingReset}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors ${
                  loading
                    ? 'cursor-not-allowed bg-surface-700 text-text-muted'
                    : 'bg-accent text-accent-foreground hover:bg-accent-hover'
                }`}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : mode === 'sign-in' ? (
                  <LogIn size={16} />
                ) : (
                  <UserPlus size={16} />
                )}
                {loading
                  ? 'Please wait...'
                  : mode === 'sign-in'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>
              {mode === 'sign-in' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || isSendingReset}
                  className="w-full rounded-xl border border-surface-600 py-2 text-xs text-text-secondary transition-colors hover:border-surface-500 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingReset ? 'Sending reset email...' : 'Forgot password?'}
                </button>
              )}
            </form>

            {error && (
              <p className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            {message && (
              <p className="mt-4 rounded-xl border border-green-500/35 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                {message}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
