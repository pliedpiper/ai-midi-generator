# Milestone Report

**Name:** Kaden Barthlome
**Reporting Period:** February 1, 2026 to February 22, 2026
**Total Hours Worked on This Project:** 45
**Total Hours Worked During This Milestone Report:** 20
**Number of Credits Enrolled:** 2

---

## 1. Milestone Goals vs. Accomplishments

### What tasks did you plan to complete during this period?

The primary goals for this milestone were the items I called out at the end of the last report: implement full user authentication with Supabase, add persistent saved compositions, build a piano roll visualization, and deploy to production. I also planned to continue expanding the model list, improve the UI layout, and harden the API layer. As with the first milestone, I continued using Claude Code to accelerate development, which again allowed me to move faster than the raw hours would suggest. This milestone focused less on standing up a new project and more on transforming an existing prototype into a multi-user, production-grade application.

### What tasks did you actually complete?

Over this milestone I shipped 41 commits across 7 active development days, touching 133 files with roughly 16,000 lines of new code. The work breaks down into four major areas:

**Authentication and User Management**

This was the biggest undertaking of the milestone. I integrated Supabase Auth with email/password login, built the full auth flow including a login page (`app/login/page.tsx`), an auth callback route (`app/auth/callback/route.ts`), and Next.js middleware (`lib/supabase/middleware.ts`) that protects all routes except `/login` and `/landing`. I created server and client Supabase helpers (`lib/supabase/server.ts`, `lib/supabase/client.ts`) and added a per-user encrypted OpenRouter key system (`utils/encryption.ts` using AES-256-GCM) so users bring their own API keys rather than sharing a server-side key.

On top of auth, I built a full account settings page (`components/AccountSettingsPage.tsx`) with password change, OpenRouter key management, data export (JSON download of all user data), and account deletion via a Postgres RPC function (`public.delete_current_user()`) with FK cascades. I wrote three SQL migrations for the `user_settings` table, `generations` table with RLS policies, and the delete function.

**Saved Generations and History**

Every successful generation now auto-saves to a `generations` table in Supabase with full composition data. I built a generations history page (`components/GenerationsPage.tsx`) with multi-field client-side search featuring relevance ranking and term highlighting, sorting by date/title/model, MIDI download with descriptive filenames, and an expanded modal view (`components/ExpandedGenerationModal.tsx`) with an integrated piano roll visualizer. The API layer includes paginated history retrieval (`app/api/generations/route.ts`), individual generation fetch and delete (`app/api/generations/[id]/route.ts`), and full-text server-side search. I also implemented request idempotency (`lib/api/idempotency.ts`) to prevent duplicate generation saves.

**Piano Roll Visualization**

I implemented a canvas-based piano roll component (`components/PianoRoll.tsx`) and supporting utilities (`utils/pianoRollUtils.ts`) that render a visual representation of MIDI compositions. The visualizer shows note positions on a pitch/time grid, color-codes by track, and is integrated into both the generation results (via `components/ExpandedAttemptModal.tsx`) and the saved generations modal. This was one of the features I specifically called out wanting in the last report.

**UI Overhaul and Landing Page**

I converted the main layout from a single-page hero design to a collapsible sidebar navigation (`components/AppHeader.tsx`) with links to the generator, saved generations, and account settings. I added an "Improve prompt" feature to the input form (`components/InputForm.tsx`) backed by a new API route (`app/api/prompt/improve/route.ts`) that uses Gemini 3 Flash to expand terse prompts into detailed generation instructions using tips from `prompts.md`. I also built a public landing page (`app/landing/page.tsx`) with real app screenshots captured via Playwright, an interactive playback demo component, and shared header/footer components.

**Infrastructure and Code Quality**

I upgraded rate limiting from in-memory to Redis-backed (`lib/rateLimit.ts` with Upstash/Vercel KV support) for consistency across server instances. I refactored the API layer by extracting shared auth, rate limiting, and request validation into reusable modules (`lib/api/auth.ts`, `lib/api/rateLimit.ts`, `lib/api/request.ts`). I modularized the generation and prompt improvement services (`app/api/generate/generateService.ts`, `app/api/prompt/improve/promptImproveService.ts`). I migrated `next.config.js` to TypeScript (`next.config.ts`), added ESLint configuration, set up a GitHub Actions CI pipeline (`.github/workflows/ci.yml`), and added Playwright for E2E testing. I also extracted UI logic into custom hooks (`hooks/useAccountSettings.ts`, `hooks/useGenerationsPage.ts`) and added database constraints with a runbook migration. The model list was updated multiple times, adding GLM 5 and Gemini 3.1 Pro Preview.

**Testing**

Testing expanded significantly: from 4 test suites to 32 test files with over 3,000 lines of test code added during this milestone. New suites cover authentication routes, account deletion, OpenRouter key management, generation history CRUD, prompt improvement, download filenames, piano roll utilities, redirect paths, sign-out logic, CSP headers, UI components (generator app, input form, landing demo), E2E flows (auth-generate-history, playback smoke), idempotency, snap options, title utilities, and request validation.

---

## 2. Learning and Application

### What new knowledge or skills did you gain during this period?

I gained significant hands-on experience with Supabase Auth and Row Level Security (RLS) policies. Setting up RLS correctly so that `user_settings` and `generations` rows are only accessible by `auth.uid() = user_id` required understanding how Supabase JWT tokens flow through server-side and client-side contexts and how policies interact with different operations (SELECT, INSERT, UPDATE, DELETE). I also learned the nuances of Supabase's auth helpers for Next.js App Router, including the distinction between server components (which use cookies) and client components (which use the browser session).

I deepened my understanding of cryptography in practice by implementing AES-256-GCM encryption for storing user API keys. This involved learning about initialization vectors (IVs), authentication tags, and why GCM mode is preferred over CBC for authenticated encryption. The key derivation from the `OPENROUTER_KEY_ENCRYPTION_SECRET` environment variable and the IV/ciphertext/tag storage format were new territory.

On the frontend, I learned canvas-based rendering for the piano roll visualizer, including how to map MIDI note numbers and beat positions to pixel coordinates, handle varying track counts with color coding, and render a responsive grid with labeled axes. I also explored Playwright for automated screenshot capture (used for landing page assets) and E2E test authoring.

### What have you applied from your coursework to your project?

From my database course, I applied relational schema design with foreign key cascades (the `generations` table references `auth.users` via `user_id` with `ON DELETE CASCADE`), wrote migration scripts, and used RLS policies as application-level access control rather than relying solely on API-layer checks.

From software engineering, I applied the principle of defense in depth by layering security at multiple levels: middleware route protection, API-level auth checks, database RLS, and encrypted key storage. I also continued applying modular architecture by extracting shared API concerns into reusable modules and separating UI logic into custom hooks.

From my AI in Software Engineering course, I applied prompt engineering techniques when building the "Improve prompt" feature, which uses a carefully crafted system prompt referencing `prompts.md` tips to transform user input into more effective generation instructions. This was a direct application of understanding how prompt structure affects LLM output quality.

---

## 3. Challenges and Problem-Solving

### What difficulties or mistakes did you encounter?

- **Supabase auth flow complexity:** Getting the login/callback/middleware chain working correctly with Next.js App Router was trickier than expected. The server-side and client-side Supabase clients behave differently, and cookie-based session management in server components required careful handling to avoid hydration mismatches.

- **CSP header conflicts with new dependencies:** Adding Supabase's auth endpoints and the Playwright-captured images to the Content Security Policy required expanding `connect-src` and `img-src` directives. Each new external dependency risked breaking the existing CSP, and debugging CSP violations is notoriously opaque since browsers only log the directive that failed, not what specifically triggered it.

- **Redis rate limiting migration:** Moving from in-memory to Redis-backed rate limiting introduced a new external dependency and required handling both Vercel KV (`KV_REST_API_URL`) and Upstash (`UPSTASH_REDIS_REST_URL`) environment variable conventions, plus graceful fallback when Redis is unavailable in local development.

- **Idempotency edge cases:** Implementing request idempotency for generation requests exposed race conditions where concurrent requests with the same idempotency key could both proceed before either wrote to the cache. I had to think carefully about the timing window and acceptable failure modes.

- **Model-driven settings revert:** I attempted to implement per-model advanced options (where different models would expose different configuration knobs), but the feature added complexity without sufficient value. I ended up reverting it (`a85dd5d`), which was a lesson in knowing when to cut scope.

### How did you address or attempt to correct them?

- For Supabase auth, I created separate server and client helpers with clear separation of concerns, wrote dedicated tests for the callback route and redirect path logic, and added middleware tests to verify route protection. I also documented the environment setup thoroughly in README.md to prevent configuration mistakes.

- For CSP, I expanded the test suite (`tests/next-config-csp.test.ts`) to programmatically verify that every required directive is present, so any future CSP change that breaks Supabase or Tone.js connectivity will fail the test suite before reaching production.

- For Redis rate limiting, I implemented a dual-variable lookup that checks Vercel KV variables first, falls back to Upstash variables, and degrades gracefully to a permissive mode if neither is configured. This was tested and documented in the README.

- For idempotency, I implemented a TTL-based cache with a configurable window and accepted that the race condition window is small enough to be acceptable for this use case, since the worst case is a duplicate row rather than data loss.

### Describe an interesting or challenging problem you faced and how you approached solving it.

The most interesting challenge this milestone was designing the encrypted API key storage system. The requirement was straightforward: users should be able to store their personal OpenRouter API key so they don't have to paste it every session, but keys must never be stored in plaintext in the database.

The first decision was choosing an encryption algorithm. I went with AES-256-GCM because it provides both confidentiality and authenticity (the authentication tag ensures the ciphertext hasn't been tampered with), and Node.js's `crypto` module supports it natively. The encryption secret comes from an environment variable (`OPENROUTER_KEY_ENCRYPTION_SECRET`), meaning the database alone is insufficient to recover keys.

The implementation stores the IV, ciphertext, and auth tag as a single colon-delimited string in the `encrypted_openrouter_key` column. Each encryption operation generates a fresh random IV, so encrypting the same key twice produces different ciphertexts, preventing pattern analysis. On the API side, I built `GET` and `POST` endpoints: the GET endpoint only returns whether a key is configured (never the key itself), while the POST endpoint encrypts and stores the key. The key is only decrypted server-side at generation time, passed directly to the OpenRouter API, and never sent back to the client.

What made this challenging was the interaction with Supabase RLS. The `user_settings` table has RLS policies restricting access to `auth.uid() = user_id`, but the encryption/decryption happens in the API route, not in the database. I had to ensure that the server-side Supabase client properly carries the user's auth context so RLS policies are enforced even when the API route is doing the encryption work. Testing this required mocking both the Supabase auth context and the encryption module to verify that unauthorized access attempts are correctly rejected at both the API and database levels.

---

## 4. Support and Improvement

### What skills or areas would you like help with to perform better on this project?

I would appreciate guidance on production deployment best practices, specifically around Vercel environment management for secrets (encryption keys, Supabase service role keys) and how to structure staging vs. production environments. I have the CI pipeline set up but haven't yet connected it to automated deployments.

I'd also like to learn more about audio DSP and post-processing. The piano roll visualization revealed that many generated compositions have timing and voicing issues that could be improved with quantization and chord voicing cleanup. Understanding how professional MIDI tools handle these corrections would help me build better post-processing into the pipeline.

---

## 5. Self-Evaluation

### How would you rate your performance for this milestone, and why?

I would rate this milestone a **9/10**. The three major features I called out at the end of the last report (authentication, saved compositions, and piano roll visualization) are all implemented and working. The app went from a single-user prototype to a multi-user application with persistent data, encrypted key storage, a full account management system, and a public landing page.

The point I'm holding back is for deployment. The app is production-ready in terms of code (Redis rate limiting, CI pipeline, ESLint, comprehensive tests), but it is not yet deployed to a public URL. That was in scope for this milestone and I didn't get to it. I also attempted and then reverted the model-driven settings feature, which cost time without shipping value, though I'd argue the learning was worthwhile.

What went well was the pace of feature delivery, the depth of the testing expansion (4 to 32 test files), and the fact that every major feature shipped with corresponding tests, API validation, and documentation updates. The encrypted key storage system and the idempotency implementation are pieces I'm particularly pleased with because they demonstrate security-first thinking beyond what the course requires.

---

## 6. Evidence of Work

**Commit History (41 commits, Feb 1–22):**

| Date | Key Commits |
|------|-------------|
| Feb 3 | Add review guidance for generated outputs |
| Feb 7 | Update default model; add piano roll + expanded modal + new test suites |
| Feb 8 | Full Supabase auth integration, encrypted key storage, account settings, generations history with search, prompt improver, model list updates, codebase review fixes |
| Feb 9 | Sidebar navigation overhaul, landing page with interactive demo, API modularization, DB constraints, idempotency, CI pipeline, E2E tests, Playwright config |
| Feb 10 | Full history search, generation handling improvements |
| Feb 12 | Add GLM 5 model, centralize API error handling |
| Feb 19 | AI-assisted code review, add Gemini 3.1 Pro Preview |

**Key Metrics:**
- 133 files changed, ~16,000 lines added
- 32 test files with 3,000+ lines of test code
- 3 SQL migrations
- 5 new API routes (generations CRUD, prompt improve, account delete/export, OpenRouter key)
- GitHub Actions CI pipeline

**Repository:** https://github.com/pliedpiper/ai-midi-generator

---

## 7. Additional Comments

This milestone felt like a qualitative shift in the project. The first milestone was about proving the concept worked; this one was about making it real. Adding authentication and persistence changed the entire user experience from "a cool demo" to "a tool I can actually come back to." I've been using the saved generations feature myself to track which prompts and models produce the best results, which has given me a much better intuition for how different LLMs handle structured music generation.

The prompt improver turned out to be more useful than I expected. Most users (including me) write terse prompts like "jazz piano," and the improver expands that into detailed instructions about tempo, key, instrumentation, and structure that the generation model can actually work with. It's a small feature but it significantly improves output quality by bridging the gap between what users think to ask for and what the model needs to hear.

The model-driven settings revert was a good lesson in scope discipline. The idea was to let each model expose its own set of configurable parameters, but in practice the feature added UI complexity without meaningfully improving the generated music. Reverting it after a day of work was the right call, and it reinforced the importance of validating that a feature actually solves a user problem before committing to it.

On the Claude Code side, this milestone pushed the tool harder than the first. The authentication integration involved coordinating changes across middleware, API routes, database migrations, UI components, and tests simultaneously, and Claude Code was effective at keeping those pieces consistent. The biggest wins were in test generation (going from 4 to 32 test files would have been tedious to do manually) and in the API refactoring, where extracting shared auth/rate-limit logic into modules required touching many files in a coordinated way. As before, I treated Claude Code's output as a first draft and reviewed everything carefully, but the velocity improvement was real.

Looking ahead, the next priorities are exploring post-processing improvements (rhythm quantization, chord voicing cleanup), and potentially adding collaborative features or a public gallery of generated compositions. The foundation is solid and the app is ready to be put in front of real users.
