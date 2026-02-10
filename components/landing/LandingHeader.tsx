import Link from 'next/link';
import { Music } from 'lucide-react';

const LandingHeader: React.FC = () => (
  <header className="sticky top-0 z-40 border-b border-surface-600/50 bg-surface-900/95 backdrop-blur-sm">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <Link href="/landing" className="flex items-center gap-2.5">
        <Music size={20} className="text-accent" />
        <span className="font-mono text-sm font-medium tracking-wide text-text-primary">
          AI MIDI Generator
        </span>
      </Link>

      <nav className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface-900 hover:bg-accent-hover transition-colors"
        >
          Get Started
        </Link>
      </nav>
    </div>
  </header>
);

export default LandingHeader;
