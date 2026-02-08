"use client";

import React from 'react';
import { LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const requestedNext = new URLSearchParams(window.location.search).get('next');
    const safeNext = requestedNext && requestedNext.startsWith('/') ? requestedNext : '/';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 text-text-primary flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-lg p-8">
        <h1 className="text-2xl font-medium mb-3">Login Required</h1>
        <p className="text-text-secondary text-sm mb-6">
          Sign in with Google to generate and save MIDI compositions.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
            loading
              ? 'bg-surface-700 text-text-muted cursor-not-allowed'
              : 'bg-accent text-surface-900 hover:bg-accent-hover'
          }`}
        >
          <LogIn size={16} />
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
