"use client";

import React from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [mode, setMode] = React.useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const requestedNext = new URLSearchParams(window.location.search).get('next') ?? '/';
    const safeNext = requestedNext.startsWith('/') ? requestedNext : '/';

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
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push(safeNext);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push(safeNext);
      router.refresh();
      return;
    }

    setMessage('Account created. Check your email to confirm, then sign in.');
    setMode('sign-in');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-lg p-8">
        <h1 className="text-2xl font-medium mb-3">Login Required</h1>
        <p className="text-text-secondary text-sm mb-6">
          Sign in with your Supabase account to generate and save MIDI compositions.
        </p>

        <div className="mb-4 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('sign-in');
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 py-2 rounded border transition-colors ${
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
            className={`flex-1 py-2 rounded border transition-colors ${
              mode === 'sign-up'
                ? 'border-accent text-accent'
                : 'border-surface-600 text-text-secondary hover:text-text-primary'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
            autoComplete="email"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full bg-surface-900 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
              loading
                ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                : 'bg-accent text-surface-900 hover:bg-accent-hover'
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
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 text-sm text-green-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
