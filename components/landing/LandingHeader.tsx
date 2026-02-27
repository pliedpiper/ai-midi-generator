import Link from 'next/link';
import { LogIn, Music, Sparkles } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

const LandingHeader: React.FC = () => (
  <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
    <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-4 pt-4 sm:px-6 md:px-8 md:pt-6">
      <Link
        href="/landing"
        className="pointer-events-auto rounded-2xl border border-surface-600/60 bg-surface-900/70 px-4 py-3 backdrop-blur-xl transition-colors hover:border-surface-500/70"
      >
        <BrandLogo className="h-10 w-auto" priority />
      </Link>

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          <nav className="flex items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl">
            <a
              href="#demo"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-text-secondary transition-colors hover:bg-surface-800 hover:text-text-primary"
            >
              <Music size={13} />
              <span>Demo</span>
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-text-secondary transition-colors hover:bg-surface-800 hover:text-text-primary"
            >
              <Sparkles size={13} />
              <span>Features</span>
            </a>
          </nav>

          <div className="flex items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl">
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary"
            >
              <LogIn size={14} />
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-xl bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Get started
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-surface-600/60 bg-surface-900/70 p-1 backdrop-blur-xl sm:hidden">
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary"
          >
            <LogIn size={14} />
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-xl bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Start
          </Link>
        </div>
      </div>
    </div>
  </header>
);

export default LandingHeader;
