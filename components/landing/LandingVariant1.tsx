import Link from 'next/link';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import { FEATURES } from './landingData';
import LandingPlaybackDemo from './LandingPlaybackDemo';

/** Variant 1 — "Bold Hero": stark minimalism, typography-driven, lots of dark space. */
const LandingVariant1: React.FC = () => (
  <>
    <LandingHeader />

    {/* Hero */}
    <section className="relative overflow-hidden px-6 py-32 md:py-44">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Compose music
          <br />
          <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">
            with words.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
          Describe a mood, a genre, an instrument — and get production-ready MIDI in seconds.
          Powered by 30+ AI models.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-block rounded-md bg-accent px-8 py-3.5 text-sm font-medium text-surface-900 hover:bg-accent-hover transition-colors"
          >
            Start composing
          </Link>
        </div>
      </div>

      {/* Decorative gradient line */}
      <div className="mx-auto mt-16 h-px max-w-2xl bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      {/* Hero playback demo */}
      <div className="mx-auto mt-16 max-w-5xl">
        <LandingPlaybackDemo />
      </div>
    </section>

    {/* Features — 3-column text grid */}
    <section className="border-t border-surface-600/50 px-6 py-24">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
        {FEATURES.slice(0, 3).map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title}>
              <Icon size={20} className="mb-3 text-accent" />
              <h3 className="text-sm font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.description}</p>
            </div>
          );
        })}
      </div>
    </section>

    {/* CTA */}
    <section className="px-6 py-20 text-center">
      <h2 className="text-2xl font-medium md:text-3xl">Ready to hear your ideas?</h2>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-block rounded-md bg-accent px-8 py-3.5 text-sm font-medium text-surface-900 hover:bg-accent-hover transition-colors"
        >
          Start composing
        </Link>
      </div>
    </section>

    <LandingFooter />
  </>
);

export default LandingVariant1;
