# Testing Guide

## Goals

The test suite is designed to catch real regressions in:

- API input/output validation and error mapping
- Abuse protections (body size limits, rate limiting)
- MIDI normalization/conversion correctness and playback lifecycle boundaries
- UI interaction flows for generation inputs and orchestration
- Client-side API service error handling

## Run Tests

```bash
npm run test:run
```

For watch mode:

```bash
npm test
```

Run full local gate (same checks as CI):

```bash
npm run check
```

Run a single test file:

```bash
npm run test:run -- tests/generate-route.test.ts
```

Run Playwright smoke tests (requires configured E2E env vars and target app):

```bash
npm run test:e2e
```

## Runner Configuration

- Vitest default environment is `node`.
- Browser-focused unit tests use file-level `// @vitest-environment jsdom`.
- Test files match `**/*.test.ts` and `**/*.test.tsx`.
- `@` path alias resolves to project root.
- CI gate runs `npm run check` (lint + typecheck + Vitest).
- Playwright smoke tests are intentionally separate from required CI checks.

Reference: `vitest.config.ts`, `playwright.config.ts`.

## Suite Map

### API Routes and Auth Boundaries

| File | Focus |
|------|-------|
| `tests/generate-route.test.ts` | `POST /api/generate`: auth guard, user key requirement, idempotency-key requirement/replay/conflict behavior, body-size limits, rate-limit headers, provider error mapping, malformed model output handling, title sanitization/fallback |
| `tests/prompt-improve-route.test.ts` | `POST /api/prompt/improve`: auth/key requirements, payload validation, rate limiting, Gemini rewriting behavior, key/BPM sanitization, provider error mapping |
| `tests/openrouter-key-route.test.ts` | `/api/user/openrouter-key` GET/DELETE flow and configured-status response shape |
| `tests/account-delete-route.test.ts` | `POST /api/account/delete`: auth guard, JSON/confirmation validation, RPC success/failure paths |
| `tests/generations-route-get.test.ts` | `GET /api/generations`: auth guard, pagination and search-query validation, hasMore/nextOffset metadata, server-side search filter wiring, and query failure mapping |
| `tests/generations-item-route-get.test.ts` | `GET /api/generations/[id]`: UUID validation, auth guard, not-found handling, and per-user detail fetch |
| `tests/generations-route-delete.test.ts` | `DELETE /api/generations`: auth guard, delete/count error handling, deleted-count correctness |
| `tests/auth-callback-route.test.ts` | `GET /auth/callback`: safe redirect sanitization and code-exchange behavior |

### Utilities and Domain Logic

| File | Focus |
|------|-------|
| `tests/validation.test.ts` | `validatePrefs` bounds/defaults and composition hard limits |
| `tests/midi-generation.test.ts` | `createMidiObject` conversion and normalization behavior |
| `tests/midiUtils.test.ts` | Note/tempo/time-signature normalization, sorting, scale-snap integration |
| `tests/midi-playback-boundary.test.ts` | Playback start/restart lifecycle boundaries with deterministic Tone mocks |
| `tests/scaleUtils.test.ts` | Scale generation, snapping tie-breaks, key parsing, drum-track detection |
| `tests/pianoRollUtils.test.ts` | Piano-roll flattening/range calculations and normalized visualization data |
| `tests/titleUtils.test.ts` | Title sanitization, quality detection, deterministic fallback naming |
| `tests/downloadFilename.test.ts` | MIDI filename generation and fallback naming |
| `tests/encryption.test.ts` | OpenRouter key encrypt/decrypt roundtrip and malformed payload handling |
| `tests/userSettings.test.ts` | OpenRouter key format validation rules |
| `tests/generationListUtils.test.ts` | My Generations search relevance, highlighting, sort modes |
| `tests/redirectPath.test.ts` | Safe `next` path sanitization |
| `tests/route.test.ts` | Legacy `extractJson` and `validateComposition` edge coverage |
| `tests/api-generate.test.ts` | Additional `extractJson` + `validateComposition` edge-case coverage |

### UI and Client Behavior

| File | Focus |
|------|-------|
| `tests/input-form.ui.test.tsx` | InputForm submission with auto/manual advanced fields + prompt improvement action |
| `tests/generator-app.ui.test.tsx` | Generator app key-setup gating and generation-attempt orchestration |
| `tests/landing-playback-demo.ui.test.tsx` | Landing hero interactive playback demo wiring (play/stop, cleanup, and playback error surface) |
| `tests/openRouterService.test.ts` | Client service error mapping for generate/improve endpoints |
| `tests/signOut.test.ts` | Sign-out redirect helper behavior |
| `tests/next-config-csp.test.ts` | CSP includes required hosts, preserves Tone `blob:` allowances, keeps `unsafe-inline` but drops `unsafe-eval` in production, supports report-only mode |

### E2E Smoke (Playwright)

| File | Focus |
|------|-------|
| `tests/e2e/auth-generate-history.spec.ts` | Sign-in, key setup, generate flow, history page load/delete smoke |
| `tests/e2e/playback-smoke.spec.ts` | Saved-generation play/stop toggle in real browser runtime |

## Mocking Strategy

- Route tests mock OpenAI SDK, Supabase wrappers, and Redis limiter wrappers.
- UI tests mock service and audio layers to keep behavior deterministic.
- Playback boundary tests mock Tone internals to verify lifecycle calls without audio hardware.
- E2E smoke tests are environment-gated and intended for staging/real integration checks.

## Remaining Gaps

- Full end-to-end determinism against real OpenRouter output semantics is still inherently probabilistic.
- Playwright smoke tests are not part of required CI and require provisioned test credentials.

## Adding New Tests

1. Add route behavior to route-specific `*-route.test.ts` files.
2. Add deterministic domain logic to utility-focused suites.
3. Add UI interaction coverage with jsdom + Testing Library when behavior crosses component boundaries.
4. Add browser/runtime smoke checks in Playwright for high-risk flows.
5. Keep assertions focused on observable outcomes (status codes, headers, rendered state, normalized outputs).
6. Update this guide whenever tests are added/removed/renamed.
