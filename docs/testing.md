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

## Suite Map

| File | Focus |
|------|-------|
| `tests/generate-route.test.ts` | `POST /api/generate` route behavior: auth guard, user key requirement, invalid JSON, size limits, rate limiting headers, provider error mapping, malformed model JSON |
| `tests/validation.test.ts` | `validatePrefs` and composition hard limits (`MAX_TRACKS`, `MAX_NOTES_PER_TRACK`, `MAX_TOTAL_NOTES`) |
| `tests/midi-generation.test.ts` | `createMidiObject` timing conversion (beats -> seconds), tempo/time signature normalization, instrument normalization |
| `tests/openRouterService.test.ts` | `generateAttempt` error surfacing, fallback message when response body is not JSON, missing composition rejection |
| `tests/midiUtils.test.ts` | Note/tempo/time-signature normalization helpers and scale-snap behavior in utility layer |
| `tests/scaleUtils.test.ts` | Scale set generation, note snapping rules, key parsing, drum-track detection |
| `tests/route.test.ts` | `extractJson` and `validateComposition` schema behavior (legacy utility coverage) |
| `tests/api-generate.test.ts` | Additional edge-case coverage for extraction and composition validation |
| `tests/encryption.test.ts` | OpenRouter key encryption/decryption roundtrip and malformed payload handling |
| `tests/userSettings.test.ts` | OpenRouter key format validation rules |

## Mocking Strategy

- Route tests mock `openai` SDK classes, Supabase auth/storage wrappers, Redis rate-limit wrapper, and completion calls to force deterministic failure/success paths.
- Service tests mock `fetch` to validate client-side error handling without network calls.
- Utility tests avoid external I/O and focus on deterministic pure-function behavior.

## What Is Not Covered Yet

- Browser UI interaction flow (`app/page.tsx`, `components/*`) in jsdom.
- End-to-end verification against a real OpenRouter provider.
- Audio playback runtime behavior in a real browser/audio context.

## Adding New Tests

1. Put API route behavior in `tests/generate-route.test.ts`.
2. Put pure validation/utility logic in the relevant `tests/*Utils*.test.ts` or `tests/validation.test.ts`.
3. Mock external dependencies (`openai`, `fetch`, browser APIs) at test boundaries.
4. Prefer assertions on observable outcomes (status codes, headers, normalized output) over implementation details.
