import Link from 'next/link';
import { FEATURES } from './landingData';
import LandingFooter from './LandingFooter';
import LandingHeader from './LandingHeader';
import LandingPlaybackDemo from './LandingPlaybackDemo';

const LandingVariant1: React.FC = () => (
  <div className="relative min-h-screen overflow-hidden bg-surface-900 text-text-primary">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgb(var(--surface-700)_/_0.5),transparent_35%),radial-gradient(circle_at_84%_10%,rgb(var(--accent)_/_0.12),transparent_30%),linear-gradient(135deg,rgb(var(--surface-900))_0%,rgb(var(--surface-800))_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-500/50 to-transparent" />
    </div>

    <LandingHeader />

    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-14 pt-28 sm:px-6 md:px-8 md:pt-32">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-surface-600/70 bg-surface-900/55 px-5 py-8 backdrop-blur-xl sm:px-8 md:px-12 md:py-10">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Compose complete MIDI ideas
          <br />
          from plain language.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-text-secondary sm:text-lg">
          Describe the vibe, instrumentation, structure, and constraints. Generate playable,
          editable MIDI in seconds with your choice of model.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Start composing
          </Link>
        </div>
      </section>

      <section id="demo" className="mx-auto mt-8 w-full max-w-5xl">
        <LandingPlaybackDemo />
      </section>

      <section
        id="features"
        className="mx-auto mt-8 w-full max-w-5xl rounded-[2rem] border border-surface-600/70 bg-surface-900/55 px-5 py-8 backdrop-blur-xl sm:px-8 md:px-10"
      >
        <h2 className="text-2xl font-medium sm:text-3xl">Why creators use AI MIDI Generator</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Keep your workflow in one place: prompt, audition, iterate, and export.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-surface-600/70 bg-surface-800/70 p-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm"
              >
                <Icon size={18} className="text-accent" />
                <h3 className="mt-3 text-sm font-medium text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>

    <LandingFooter />
  </div>
);

export default LandingVariant1;
