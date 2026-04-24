# AI MIDI Generator

Authenticated Next.js app for generating MIDI compositions from text prompts with OpenRouter-backed models, playing them in the browser, and saving them to a Supabase-backed account history.

## Live Demo

[ai-midi-generator-murex.vercel.app](https://ai-midi-generator-murex.vercel.app/)

## What It Does

- Generates structured MIDI compositions from natural-language prompts.
- Lets signed-in users choose from 30+ OpenRouter model IDs defined in [`constants.ts`](constants.ts).
- Supports up to 5 generation attempts per request with per-attempt variation prompts.
- Includes advanced controls for tempo, key, time signature, bar count, constraints, scale snapping, and 10 generation styles.
- Plays results in the browser with Tone.js and exports standard `.mid` files.
- Saves generations to Supabase and exposes a paginated history view with search, sorting, detail loading, playback, and deletion.
- Includes account settings for password changes, email changes, OpenRouter key management, JSON data export, bulk generation deletion, and full account deletion.
- Provides a prompt improver route backed by `google/gemini-3-flash-preview`, using guidance from [`prompts.md`](prompts.md).
- Ships with a public landing page and interactive demo composition.

## Stack

- Next.js 15 App Router
- React 19
- Tailwind CSS
- Tone.js and `@tonejs/midi`
- Supabase Auth + Postgres
- OpenRouter via the `openai` SDK
- Upstash Redis / Vercel KV-compatible REST API for rate limiting and idempotency
- Vitest + Testing Library

## Quick Start

CI runs on Node 22, so using a current Node 22 install is the safest local baseline.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Before the app can work end to end, you also need to:

1. Create a Supabase project.
2. Enable email/password auth in Supabase Auth.
3. Configure the environment variables in `.env.local`.
4. Run the SQL files in [`supabase/migrations`](supabase/migrations) against your Supabase database.
5. Set your local site URL in Supabase to `http://localhost:3000`.
6. For password reset flow, allow the reset redirect used by the app (`/reset-password`).

After signing in, add an OpenRouter API key in the app before generating.

## Environment Variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes* | Preferred Supabase browser key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes* | Legacy fallback supported by the code |
| `OPENROUTER_KEY_ENCRYPTION_SECRET` | Yes | Used to encrypt user OpenRouter keys before database storage |
| `KV_REST_API_URL` | Yes* | Preferred Redis endpoint |
| `KV_REST_API_TOKEN` | Yes* | Preferred Redis token |
| `UPSTASH_REDIS_REST_URL` | Yes* | Fallback Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes* | Fallback Redis token |
| `CSP_REPORT_ONLY` | No | When `true`, serves CSP in report-only mode |
| `CSP_REPORT_URI` | No | Optional report endpoint included in CSP |

`*` For Supabase client auth, provide either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`. For Redis, provide either the `KV_*` pair or the `UPSTASH_*` pair.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint with warnings treated as failures |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |
| `npm run check` | Run lint, typecheck, and tests |

## Testing

The checked-in test setup is Vitest-based. There is no runnable Playwright test command in `package.json`.

- Main guide: [`docs/testing.md`](docs/testing.md)
- Style-system notes: [`docs/generation-styles.md`](docs/generation-styles.md)
- CI workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

## Project Layout

```text
app/
  api/                     Server routes for generation, prompt improvement, history, and account actions
  account/                 Authenticated account settings page
  generations/             Authenticated saved-history page
  landing/                 Public landing page
  login/                   Sign-in and sign-up flow
  reset-password/          Password reset flow
components/                UI for generator, history, landing, account, playback, and modals
hooks/                     Client hooks split by generator, generations, and account flows
lib/                       Supabase, security, rate limiting, API helpers, and generation styles
services/                  Browser-side API helpers
supabase/                  SQL migrations and operational runbooks
tests/                     Vitest route, utility, and UI test suites
utils/                     MIDI normalization, playback, export, validation, and list helpers
```

## Behavior Notes

- The authenticated app routes (`/`, `/generations`, `/account`) redirect unauthenticated users to `/login`.
- User OpenRouter keys are validated, encrypted server-side, and stored in `user_settings`.
- `POST /api/generate` uses Redis-backed rate limiting plus idempotency lock/result keys to avoid duplicate paid requests on retries.
- Saved history metadata is loaded separately from full composition payloads; full composition JSON is fetched on demand for playback, detail view, or download.
- CSP headers are applied from both `next.config.ts` and `middleware.ts`, with optional report-only rollout.

## Repo Gaps

- This repo documents local setup, CI, and Supabase migrations, but it does not include a checked-in deployment configuration beyond the standard Next.js app and environment-variable expectations.
- The exact production URL is not documented in the codebase and is intentionally omitted here.
