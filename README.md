# AI MIDI Generator

Generate MIDI compositions from text prompts using LLMs. Users authenticate with Supabase email/password login, configure their own OpenRouter key once, and every successful generation is auto-saved.

## Features

- **Text-to-MIDI**: Describe music in natural language, get a MIDI file
- **Multiple models**: Choose from GPT-5.2, Claude Sonnet/Opus, Gemini, DeepSeek, Grok, and more via OpenRouter
- **In-browser playback**: Listen instantly with Tone.js synthesis
- **Variations**: Generate up to 5 variations per prompt
- **Advanced controls**: Tempo, key, time signature, duration, and constraints
- **MIDI export**: Download generated compositions as .mid files
- **Supabase login**: Email/password auth + route protection
- **Saved history**: Replay/download/delete generations from **My Generations**

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Audio**: Tone.js + @tonejs/midi
- **API**: OpenRouter (OpenAI SDK compatible)
- **Auth + DB**: Supabase (Auth + Postgres + RLS)
- **Testing**: Vitest

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
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

## Testing

This project uses Vitest for fast unit/integration-style testing of the API route, validation logic, MIDI generation utilities, scale logic, and client service behavior.

- Run once: `npm run test:run`
- Watch mode: `npm test`
- Detailed strategy and suite map: [`docs/testing.md`](docs/testing.md)

## Project Structure

```
├── app/
│   ├── api/generate/    # MIDI generation endpoint
│   ├── api/generations/ # Saved generations API
│   ├── api/user/openrouter-key/ # User key setup API
│   ├── login/           # Email/password auth entry page
│   ├── generations/     # Saved generations page
│   ├── page.tsx         # Main UI
│   └── layout.tsx       # App layout
├── components/
│   ├── InputForm.tsx    # User input form
│   └── AttemptCard.tsx  # Playback/download UI
├── lib/
│   ├── supabase/        # Supabase client/server/middleware helpers
│   └── userSettings.ts  # OpenRouter key validation/storage helpers
├── supabase/
│   └── migrations/      # SQL schema + RLS policies
├── utils/
│   ├── midiUtils.ts     # MIDI conversion & playback
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

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported as a legacy fallback, but publishable key is preferred.
`*` For Redis, provide either the `KV_*` pair or the `UPSTASH_*` pair.

User OpenRouter keys are entered in the app after login and stored encrypted in `user_settings`.

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Auth, ensure **Email** provider is enabled (default in most projects).
3. Configure email confirmation behavior as desired:
   - If confirmation is enabled, users must verify email after sign-up before signing in.
   - If disabled, users can sign in immediately after sign-up.
4. Run SQL migration from `supabase/migrations/20260208_auth_and_generations.sql`.
5. Set Site URL (for auth emails) to your app URL:
   - local: `http://localhost:3000`
   - production: your deployed domain

## How It Works

1. User logs in (or signs up) with email/password via Supabase Auth.
2. User adds OpenRouter key once (stored encrypted, per account).
3. User describes desired music and starts generation.
4. App sends prompt to selected LLM via OpenRouter using that user key.
5. LLM returns structured JSON with tracks and note timing.
6. App validates output, saves the generation row, and returns composition.
7. Tone.js plays composition; user can download or view later in **My Generations**.

## Security

- Login required for generation and saved-history access
- Rate limited: 10 requests/minute per user (Redis-backed, shared across instances)
- Input validation with size limits
- CSP headers configured for safe audio playback
- Row-Level Security (RLS) policies enforce per-user data access
- OpenRouter keys encrypted before database storage

## OpenRouter Key Safety

- User OpenRouter keys are submitted to the server over HTTPS and encrypted before being written to `user_settings`.
- Keys are decrypted only inside the server route that calls OpenRouter (`app/api/generate/route.ts`).
- The app does not expose an endpoint that returns raw OpenRouter keys to clients.
- Other users cannot read your key through normal app usage because of RLS and server-side handling.
- Operational caveat: anyone with privileged access to both database contents and `OPENROUTER_KEY_ENCRYPTION_SECRET` could decrypt stored keys. Keep production access tightly restricted.
