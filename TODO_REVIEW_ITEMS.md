# Review TODO

Ordered from highest-value / lowest-ambiguity work to lower-priority or verify-first items.

## 1. Immediate fixes

1. [ ] Fix the CSP/README mismatch.
Update [next.config.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/next.config.ts) so production `script-src` no longer always includes `'unsafe-inline'`, then update [README.md](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/README.md) and [tests/next-config-csp.test.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/tests/next-config-csp.test.ts). Best version: move to nonce-based CSP.

2. [ ] Reject fractional `attemptIndex`.
Add `Number.isInteger` in [app/api/generate/requestValidation.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/generate/requestValidation.ts) and add a test in [tests/generate-request-validation.test.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/tests/generate-request-validation.test.ts).

3. [ ] Tighten composition note validation.
In [utils/validation.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/utils/validation.ts), validate MIDI range, `time >= 0`, and `duration > 0`. Add tests for bad note payloads.

4. [ ] Make `extractJson` robust.
Replace the current first-`{` / last-`}` slicing in [utils/validation.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/utils/validation.ts) with balanced-object extraction, or move the model call to structured JSON output if the provider supports it. Update [tests/api-generate.test.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/tests/api-generate.test.ts) and [tests/route.test.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/tests/route.test.ts).

5. [ ] Add request fingerprinting to idempotency.
Extend [lib/api/idempotency.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/lib/api/idempotency.ts) so cached results are tied to both the idempotency key and a normalized body hash. Return `409` on mismatched replays.

6. [ ] Add a cheap pre-auth rate limit.
In [app/api/generate/route.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/generate/route.ts), add an IP bucket before auth/key resolution so abusive traffic does not get a free pass to Supabase and Redis-backed auth work.

7. [ ] Harden client IP handling.
Document the trusted-proxy assumption around `x-forwarded-for` in [lib/api/request.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/lib/api/request.ts), or switch to a safer deployment-specific source when available.

## 2. Security hardening

8. [ ] Add CSRF defense-in-depth for state-changing routes.
Create a small helper that validates `Origin` / `Sec-Fetch-Site` for `POST` / `DELETE` routes such as:
[app/api/generate/route.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/generate/route.ts)
[app/api/prompt/improve/route.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/prompt/improve/route.ts)
[app/api/user/openrouter-key/route.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/user/openrouter-key/route.ts)
[app/api/account/delete/route.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/account/delete/route.ts)
[app/api/generations/[id]/route.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/app/api/generations/%5Bid%5D/route.ts)

9. [ ] Add HSTS.
Add `Strict-Transport-Security` in [next.config.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/next.config.ts) for production deployments.

10. [ ] Add encryption key rotation support.
Extend [utils/encryption.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/utils/encryption.ts) to support multiple active key versions, then add a runbook under [supabase/ops](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/supabase/ops).

11. [ ] Improve structured logging around existing trace IDs.
You already generate trace IDs in [lib/api/request.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/lib/api/request.ts). Make logs more consistent and route-friendly so they are usable in production.

12. [ ] Decide whether to replace hand-rolled validators with Zod or Valibot.
This is optional, but it would simplify request and composition schemas if you want a cleaner validation story.

## 3. Demo and proposal-gap work

13. [ ] Restore the deleted Playwright smoke tests.
Bring back `playwright.config.ts`, `tests/e2e/auth-generate-history.spec.ts`, and `tests/e2e/playback-smoke.spec.ts` so the app has a strong end-to-end demo path again.

14. [ ] Add WAV export.
This is one of the clearest proposal-gap features and would show well in a final demo.

15. [ ] Add pause + seek controls.
Playback currently starts/stops, but richer transport controls would noticeably improve UX.

16. [ ] Add one minimal piano-roll edit action plus undo/redo.
Even one real edit operation would make the “editor” claim much easier to defend.

17. [ ] Add cost / token usage tracking per generation.
Persist and display provider usage metadata if available.

18. [ ] Consider one additional showcase feature.
Best candidates: MIDI import/extend, sheet music view, shareable links, or streaming generation progress.

## 4. Verify before changing

19. [ ] Verify whether API routes really need middleware-based Supabase session refresh.
The current review claim is plausible, but not confirmed from code alone because API routes also create a Supabase server client that can write cookies.

20. [ ] Do not spend time adding a title-length cap unless a new path bypasses title finalization.
The generation flow already runs titles through [utils/titleUtils.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/utils/titleUtils.ts), which caps them before insert.

21. [ ] Do not add `Retry-After` work for 429s.
That is already implemented in [lib/api/rateLimit.ts](/Users/kadenbarthlome/Documents/School/2026-Spring/CS%204800/ai-midi-generator/lib/api/rateLimit.ts).
