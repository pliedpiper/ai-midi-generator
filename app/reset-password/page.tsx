"use client";

import React from 'react';
import Link from 'next/link';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const hydrateSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (active) {
        setHasSession(Boolean(session));
      }
    };

    hydrateSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }
      setHasSession(Boolean(session));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || !confirmPassword) {
      setError('Enter and confirm your new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    setMessage('Password updated. Redirecting to sign in...');
    setTimeout(() => {
      router.push('/login');
      router.refresh();
    }, 900);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-900 text-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 background-blob-sunset" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-500/50 to-transparent" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-16 sm:px-6">
        <section className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-surface-600/70 bg-surface-800/70 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-surface-600/80 bg-surface-900/80 text-accent">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h1 className="text-xl font-medium">Reset password</h1>
              <p className="text-xs text-text-secondary">Use the recovery link from your email to continue.</p>
            </div>
          </div>

          {hasSession === false ? (
            <div className="space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <p>
                This page needs an active recovery link. Open the latest reset email and click the button in that
                message.
              </p>
              <Link
                href="/login"
                className="inline-flex rounded-lg border border-surface-500 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-surface-400 hover:text-text-primary"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-surface-600 bg-surface-900 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
              />
              <button
                type="submit"
                disabled={isSubmitting || hasSession !== true}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors ${
                  isSubmitting || hasSession !== true
                    ? 'cursor-not-allowed bg-surface-700 text-text-muted'
                    : 'bg-accent text-accent-foreground hover:bg-accent-hover'
                }`}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSubmitting ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          )}

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
      </main>
    </div>
  );
};

export default ResetPasswordPage;
