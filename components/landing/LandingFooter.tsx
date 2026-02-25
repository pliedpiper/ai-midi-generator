import Link from 'next/link';

const LandingFooter: React.FC = () => (
  <footer className="relative z-10 border-t border-surface-600/50 bg-surface-900/45 backdrop-blur-sm">
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 sm:flex-row">
      <p className="font-mono text-xs tracking-[0.14em] text-text-muted">AI MIDI Generator</p>
      <Link
        href="/login"
        className="text-xs text-text-secondary transition-colors hover:text-text-primary"
      >
        Sign in to start composing
      </Link>
    </div>
  </footer>
);

export default LandingFooter;
