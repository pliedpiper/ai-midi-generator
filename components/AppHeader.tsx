"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface AppHeaderProps {
  userEmail: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ userEmail }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="border-b border-surface-600/50 backdrop-blur-sm bg-surface-900/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-mono text-sm font-medium tracking-wide text-text-primary">
            MIDI GENERATOR
          </span>

          <nav className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider">
            <Link
              href="/"
              className={pathname === '/' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}
            >
              Generate
            </Link>
            <Link
              href="/generations"
              className={pathname === '/generations' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'}
            >
              My Generations
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-xs text-text-muted">
            {userEmail}
          </span>

          <Link
            href="/account"
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              pathname === '/account'
                ? 'bg-surface-600 text-text-primary'
                : 'bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
            }`}
          >
            Account
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              isSigningOut
                ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                : 'bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
            }`}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
