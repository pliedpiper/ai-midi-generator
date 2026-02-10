# AI MIDI Generator

Generate MIDI compositions from text prompts using LLMs. Users authenticate with Supabase email/password login, configure their own OpenRouter key once, and every successful generation is auto-saved.

## Features

- **Text-to-MIDI**: Describe music in natural language, get a MIDI file
- **Multiple models**: Choose from GPT-5.2, Claude Sonnet/Opus, Gemini, DeepSeek, Grok, and more via OpenRouter
- **In-browser playback**: Listen instantly with Tone.js synthesis
- **Variations**: Generate up to 5 variations per prompt
- **Advanced controls**: Tempo, key, time signature, duration, and constraints
- **Per-field model choice**: Each advanced timing/key field can be set to "Let model decide"
- **Scale snapping preserved**: When key is model-decided, snapping uses the generated composition key
- **Prompt improver**: Refine prompt text in-place with Gemini 3 Flash using `prompts.md` tips
- **MIDI export**: Download generated compositions as .mid files
- **Clean generation titles**: Server-side title sanitization removes variation/hash artifacts with deterministic fallback naming
- **Supabase login**: Email/password auth + route protection
- **Account settings**: Change email/password, manage OpenRouter key, export data, and delete account
- **Saved history**: Replay/download/delete generations from **My Generations**
- **Paginated history**: Load older generations on demand with server-side pagination
- **History discovery tools**: Search across prompt/title/model/key/date with multi-word matching, relevance ranking + match highlights, and sorting by newest/oldest, length, track count, or key
- **Expanded visualizer**: Open any saved generation in a detailed modal with piano-roll visualization
- **Interactive landing demo**: Public landing hero now includes a real playable preset (same playback stack as the app)

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Audio**: Tone.js + @tonejs/midi
- **API**: OpenRouter (OpenAI SDK compatible)
- **Auth + DB**: Supabase (Auth + Postgres + RLS)
- **Testing**: Vitest + Playwright (smoke)

## Quick Start

**Prerequisites**: Node.js 18+

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# then fill in Supabase values + OPENROUTER_KEY_ENCRYPTION_SECRET + Redis vars (KV_* preferred)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Then create an account/sign in and add your OpenRouter key inside the app when prompted.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Serve production build |
| `npm run lint` | Run ESLint (warnings fail) |
| `npm run typecheck` | Run TypeScript check (`tsc --noEmit`) |
| `npm run check` | Run lint + typecheck + tests |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:e2e` | Run Playwright smoke tests |
| `npm run test:e2e:headed` | Run Playwright smoke tests in headed mode |

## Testing

This project uses Vitest for unit/integration-style coverage and Playwright for browser-runtime smoke checks.

- Run once: `npm run test:run`
- Watch mode: `npm test`
- Full local quality gate (same as CI): `npm run check`
- Browser smoke checks: `npm run test:e2e`
- Detailed strategy and suite map: [`docs/testing.md`](docs/testing.md)

## CI

- GitHub Actions runs `npm run check` on every push and pull request (`.github/workflows/ci.yml`).
- `npm run check` enforces lint + typecheck + tests as required gates.
- TypeScript is configured in strict mode (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).

## Project Structure

```
├── app/
│   ├── api/generate/    # MIDI generation endpoint
│   ├── api/prompt/improve/ # Prompt rewrite endpoint (Gemini 3 Flash)
│   ├── api/generations/ # Saved generations API
│   ├── api/account/     # Account delete/export endpoints
│   ├── api/user/openrouter-key/ # User key setup API
│   ├── login/           # Email/password auth entry page
│   ├── generations/     # Saved generations page
│   ├── account/         # Account settings page
│   ├── page.tsx         # Main UI
│   └── layout.tsx       # App layout
├── components/
│   ├── InputForm.tsx    # User input form
│   ├── AttemptCard.tsx  # Playback/download UI
│   └── ExpandedGenerationModal.tsx # Saved generation expanded visual view
├── hooks/               # Client state hooks for large page flows
├── lib/
│   ├── supabase/        # Supabase client/server/middleware helpers
│   └── userSettings.ts  # OpenRouter key validation/storage helpers
├── supabase/
│   ├── migrations/      # SQL schema + RLS/constraints
│   └── ops/             # Manual audit/rollback runbooks
├── utils/
│   ├── midiUtils.ts     # MIDI conversion & playback
│   ├── titleUtils.ts    # Generation title sanitization + fallback naming
│   ├── encryption.ts    # AES-GCM key encryption/decryption
│   └── validation.ts    # Input/output validation
├── services/
│   └── openRouterService.ts  # API client
├── tests/               # Vitest suites
├── docs/
│   └── testing.md       # Testing strategy and coverage map
├── constants.ts         # Models, prompts, defaults
└── types.ts             # TypeScript types
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key (recommended) |
| `OPENROUTER_KEY_ENCRYPTION_SECRET` | Yes | Server-side secret used to encrypt user OpenRouter keys |
| `KV_REST_API_URL` | Yes* | Vercel KV REST URL (preferred for distributed rate limiting) |
| `KV_REST_API_TOKEN` | Yes* | Vercel KV REST token (preferred for distributed rate limiting) |
| `UPSTASH_REDIS_REST_URL` | Yes* | Upstash Redis REST URL (fallback if not using `KV_*`) |
| `UPSTASH_REDIS_REST_TOKEN` | Yes* | Upstash Redis REST token (fallback if not using `KV_*`) |
| `CSP_REPORT_ONLY` | No | When `true`, serve CSP as `Content-Security-Policy-Report-Only` for staged rollout |
| `CSP_REPORT_URI` | No | Optional CSP report endpoint URL added via `report-uri` directive |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported as a legacy fallback, but publishable key is preferred.
`*` For Redis, provide either the `KV_*` pair or the `UPSTASH_*` pair.

User OpenRouter keys are entered in the app after login and stored encrypted in `user_settings`.

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Auth, ensure **Email** provider is enabled (default in most projects).
3. Configure email confirmation behavior as desired:
   - If confirmation is enabled, users must verify email after sign-up before signing in.
   - If disabled, users can sign in immediately after sign-up.
4. Run SQL migrations in `supabase/migrations/`:
   - `supabase/migrations/20260208_auth_and_generations.sql`
   - `supabase/migrations/20260208_delete_current_user_function.sql`
   - `supabase/migrations/20260208_user_settings_delete_policy.sql`
   - `supabase/migrations/20260209_generations_db_constraints.sql`
5. Optional but recommended before/after Phase 6 rollout:
   - run audit/verification SQL in `supabase/ops/20260209_generations_constraints_runbook.sql`
6. Set Site URL (for auth emails) to your app URL:
   - local: `http://localhost:3000`
   - production: your deployed domain

## How It Works

1. User logs in (or signs up) with email/password via Supabase Auth.
2. User adds OpenRouter key once (stored encrypted, per account).
3. User describes desired music and starts generation.
4. Optional: user can click **Improve prompt** to rewrite their text using the `prompts.md` guidance.
5. User can leave any advanced timing/key field on **Let model decide**; omitted fields are chosen by the model.
6. App sends prompt to selected LLM via OpenRouter using that user key.
7. LLM returns structured JSON with tracks and note timing.
8. App validates output, saves the generation row, and returns composition.
9. Tone.js plays composition; user can download or view later in **My Generations**.
10. Users can manage account settings in **Account** (email/password updates, data export, key removal, and account deletion).

## Security

- Login required for generation and saved-history access
- Rate limited: 10 requests/minute per user (Redis-backed, shared across instances)
- Idempotency key required on generation requests to prevent duplicate paid model calls on client retries
- Input validation with size limits
- CSP headers configured for safe audio playback (including `blob:` for Tone.js)
- Production CSP omits `'unsafe-inline'` and `'unsafe-eval'` in `script-src` by default; report-only mode is available with `CSP_REPORT_ONLY=true`
- Row-Level Security (RLS) policies enforce per-user data access
- Database constraints enforce positive `attempt_index` and conservative JSON shape checks for `prefs`/`composition`
- OpenRouter keys encrypted before database storage
- Account deletion uses a dedicated authenticated SQL RPC (`delete_current_user`) and cascades app data via foreign keys

## OpenRouter Key Safety

- User OpenRouter keys are submitted to the server over HTTPS and encrypted before being written to `user_settings`.
- Keys are decrypted only inside server routes that call OpenRouter (`app/api/generate/route.ts` and `app/api/prompt/improve/route.ts`).
- The app does not expose an endpoint that returns raw OpenRouter keys to clients.
- Other users cannot read your key through normal app usage because of RLS and server-side handling.
- Operational caveat: anyone with privileged access to both database contents and `OPENROUTER_KEY_ENCRYPTION_SECRET` could decrypt stored keys. Keep production access tightly restricted.
