# Testing Guide

## Goals

The test suite is designed to catch real regressions in:

- API input/output validation and error mapping
- Abuse protections (body size limits, rate limiting)
- MIDI normalization and conversion correctness
- Scale snapping and key parsing behavior
- Client-side API service error handling

## Run Tests

```bash
npm run test:run
```

For watch mode:

```bash
npm test
```

Run the full local gate (lint + typecheck + tests):

```bash
npm run check
```

Run a single file:

```bash
npm run test:run -- tests/generate-route.test.ts
```

Filter by test name:

```bash
npm run test:run -- -t "POST /api/generate"
```

## Runner Configuration

- Vitest runs in `node` environment (not `jsdom`).
- Test files match `**/*.test.ts`.
- `@` path alias resolves to the project root.
- CI uses `npm run check` so lint and typecheck failures block PRs before test execution.

Reference: `vitest.config.ts`.

## Suite Map

### API Routes and Auth Boundaries

| File | Focus |
|------|-------|
| `tests/generate-route.test.ts` | `POST /api/generate`: auth guard, user key requirement, body-size limits, rate-limit headers, provider error mapping, malformed model output handling, and title sanitization/fallback behavior |
| `tests/prompt-improve-route.test.ts` | `POST /api/prompt/improve`: auth/key requirements, payload validation, rate limiting, Gemini prompt rewriting behavior, key/BPM sanitization, and provider error mapping |
| `tests/openrouter-key-route.test.ts` | `/api/user/openrouter-key` GET/DELETE flow, configured status response shape, and deletion failure handling |
| `tests/account-delete-route.test.ts` | `POST /api/account/delete`: auth guard, JSON/confirmation validation, and `delete_current_user` RPC success/failure paths |
| `tests/generations-route-delete.test.ts` | `DELETE /api/generations`: auth guard, delete/count error handling, and deleted-count response correctness |
| `tests/auth-callback-route.test.ts` | `GET /auth/callback`: safe redirect sanitization and code-exchange behavior |
| `tests/route.test.ts` | Legacy utility coverage for `extractJson` and `validateComposition` |
| `tests/api-generate.test.ts` | Additional `extractJson` + `validateComposition` edge-case coverage |

### Utilities and Domain Logic

| File | Focus |
|------|-------|
| `tests/validation.test.ts` | `validatePrefs` bounds/defaults and composition hard limits (`MAX_TRACKS`, `MAX_NOTES_PER_TRACK`, `MAX_TOTAL_NOTES`) |
| `tests/midi-generation.test.ts` | `createMidiObject` conversion and normalization behavior |
| `tests/midiUtils.test.ts` | Note/tempo/time-signature normalization, sort behavior, and scale-snap integration |
| `tests/scaleUtils.test.ts` | Scale set generation, note snapping tie-breaks, key parsing, and drum-track detection |
| `tests/pianoRollUtils.test.ts` | Piano-roll flattening/range calculations and normalized visualization data |
| `tests/titleUtils.test.ts` | Title sanitization, quality detection, deterministic fallback naming, and final title resolution |
| `tests/downloadFilename.test.ts` | MIDI filename generation, accidental normalization, and fallback naming |
| `tests/encryption.test.ts` | OpenRouter key encryption/decryption roundtrip and malformed payload handling |
| `tests/userSettings.test.ts` | OpenRouter key format validation rules |
| `tests/generationListUtils.test.ts` | My Generations search relevance, highlighting, and sort modes |
| `tests/redirectPath.test.ts` | Safe `next` path sanitization for redirects |

### Client/Config Behavior

| File | Focus |
|------|-------|
| `tests/openRouterService.test.ts` | Client service error mapping for generate/improve endpoints and payload shape expectations |
| `tests/signOut.test.ts` | Sign-out redirect helper behavior for success/failure |
| `tests/next-config-csp.test.ts` | CSP header includes required Google Fonts hosts, preserves Tone.js `blob:` allowances, drops `unsafe-eval` in production, and supports report-only mode |

## Mocking Strategy

- Route tests mock `openai` SDK classes, Supabase auth/storage wrappers, Redis rate-limit wrapper, and completion calls to force deterministic failure/success paths.
- Service tests mock `fetch` to validate client-side error handling without network calls.
- Utility tests avoid external I/O and focus on deterministic pure-function behavior.

## What Is Not Covered Yet

- Browser UI interaction flow (`app/page.tsx`, `components/*`) in jsdom.
- End-to-end verification against a real OpenRouter provider.
- Audio playback runtime behavior in a real browser/audio context.

## Adding New Tests

1. Add route behavior to the route-specific file in `tests/` (or create one following `*-route.test.ts` naming).
2. Add pure validation/utility logic to the relevant `tests/*Utils*.test.ts`, `tests/validation.test.ts`, or a focused `tests/<module>.test.ts`.
3. Mock external dependencies (`openai`, Supabase clients, Redis wrappers, `fetch`) at test boundaries.
4. Prefer assertions on observable outcomes (status codes, headers, response JSON, normalized output) over implementation details.
5. Update this guide whenever adding/removing test files so the suite map stays accurate.
