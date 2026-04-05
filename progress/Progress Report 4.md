# Milestone Report

**Name:** Kaden Barthlome
**Reporting period:** from March 14, 2026 to April 5, 2026
**Total hours worked on this project:**
**Total Hours worked during this milestone report:**
**Number of Credits enrolled:**

---

## 1. Milestone Goals vs. Accomplishments

### What tasks did you plan to complete during this period?

My goal for this period was not to add a major new system. The last report already covered a large polish pass across the interface. After that point, I wanted to keep improving the app in a more targeted way. I planned to keep the model list current, reduce small points of friction in the generator flow, and simplify parts of the code that had become more complex than they needed to be.

I also wanted to make the app more efficient. As the project matured, it was becoming more important to think not only about whether the features worked, but also about how much code the browser had to load and how much work the UI was doing during playback and generation.

### What tasks did you actually complete?

I completed a smaller but still meaningful milestone focused on model support, code simplification, and performance work. After the last milestone report was added on March 17, the git history shows four additional commits across three active work days: March 17, March 18, and April 1, 2026. Those committed changes added 57 lines and removed 30 lines across eight tracked files. In addition, I completed local work on April 5 that has not yet been committed but is part of the current state of the project. Compared with the repo state at the last report commit, the project now reflects 18 changed files with 304 insertions and 447 deletions.

The first part of this period was about model support. I added GPT-5.4 mini and GPT-5.4 nano. I then added Hunter Alpha. Later, I added Claude Sonnet 4.6 and MiniMax M2.5. This kept the generator current with newer model options and made the app more flexible for comparing outputs across different providers and model sizes.

I also simplified the MIDI snapping flow. Some of the generation and playback code had extra logic around snap handling, and I reduced that complexity. This made the code easier to follow and lowered the chance of inconsistent behavior between different parts of the app.

The most important work in the current workspace is performance-focused. I split the MIDI utility layer into smaller modules so that the app no longer has to pull in heavy playback and MIDI export code on first load. I moved the Tone.js playback code and MIDI file export code behind lazy imports. I also changed the app so MIDI blobs are no longer created eagerly for every successful attempt. Instead, the blob is generated only when the user actually downloads a file.

I also optimized the piano roll. Before this change, the canvas was redrawing the full background, note grid, and note boxes every time the playback beat advanced. I changed that to use a static base canvas plus a separate overlay canvas for the playhead. That means playback now updates only the moving playhead rather than repainting the whole visualization every frame.

This work produced a measurable improvement in build output. After the refactor, the first-load JavaScript dropped from about 253 kB to 185 kB on the main generator page, from about 250 kB to 182 kB on the saved generations page, and from about 188 kB to 120 kB on the landing page. This milestone therefore improved both maintainability and runtime efficiency.

---

## 2. Learning and Application

### What new knowledge or skills did you gain during this period?

I learned more about frontend performance work in a practical setting. This period made it clear that performance is not only about algorithms. It is also about when code gets loaded, how much state is recalculated, and whether the browser is repainting more than it needs to.

I also learned more about code-splitting and lazy loading in a Next.js app. The MIDI features are useful, but they are also relatively heavy. Splitting that logic into smaller modules showed me how to keep advanced features without forcing every page load to pay the full cost up front.

I also learned more about render strategy for visual components. The piano roll looked correct before, but it was doing too much work during playback. Separating static drawing from dynamic drawing was a good example of how a rendering problem can often be solved by changing the structure of the component, not just by making small tweaks inside the same loop.

### What have you applied from your coursework to your project?

I applied modular design again in this milestone. The MIDI code was originally grouped in one utility file, but that made it harder to optimize. By separating pure math helpers, note normalization, playback logic, and export logic, I made the project easier to reason about and easier to load efficiently.

I also applied performance analysis and iterative refinement. I did not stop at noticing that the code could be faster. I checked what was actually being imported, reduced unnecessary work, and verified the result with tests and a production build.

I also applied testing practice. As I added models and changed the MIDI utility boundaries, I updated validation and UI tests and reran the full test suite. That helped me refactor with more confidence.

---

## 3. Challenges and Problem-Solving

### What difficulties or mistakes did you encounter?

One challenge in this period was that the project did not need a dramatic new feature as much as it needed careful refinement. That kind of work is harder to describe and sometimes harder to plan because the gains come from many small decisions rather than one obvious feature.

Another challenge was balancing flexibility with simplicity. The model list continued to grow, which is good for the user, but every added model increases the need for clean validation and clear UI behavior. At the same time, the MIDI and playback code needed to stay powerful without making the app heavier than necessary.

I also had to be careful during the performance refactor. Splitting a utility layer can easily break tests or create inconsistent behavior if different parts of the app expect the old API shape.

### How did you address or attempt to correct them?

I addressed the model growth by making small, targeted updates instead of redesigning the whole input flow again. I added the models, updated tests, and kept the validation logic in sync.

For the complexity issue, I reduced duplication and moved responsibilities into smaller files. That let me keep the same user-facing behavior while simplifying the internal structure.

For the performance work, I made the changes incrementally and verified them with tooling. I ran lint, type-checking, the full Vitest suite, and a production build after the refactor. That let me confirm the project still behaved correctly while also showing that the build output improved.

### Describe an interesting or challenging problem you faced and how you approached solving it.

The best example from this period was the piano roll playback issue. The component was working correctly, but it was doing more rendering work than necessary. Every playback tick caused the full canvas to redraw, including content that never changed during playback.

I approached that by separating the problem into static and dynamic layers. The background lanes, beat grid, and note blocks only need to be drawn when the composition, theme, or size changes. The playhead is the only part that needs continuous updates. By putting those responsibilities on separate canvases, I reduced the amount of repeated drawing without changing how the feature looks to the user.

This was a good example of a software engineering lesson that goes beyond syntax: sometimes the right fix is not to optimize a loop, but to redesign the component so the loop no longer has to do unnecessary work in the first place.

---

## 4. Support and Improvement

### What skills or areas would you like help with to perform better on this project?

I would like more guidance on advanced frontend performance profiling. I improved bundle size and rendering behavior in this milestone, but I would benefit from stronger habits around measuring runtime cost, spotting expensive imports, and identifying unnecessary renders earlier.

I would also like more help with architectural decisions for medium-sized React and Next.js projects. As the app grows, I want to keep its structure clear so that future features do not slowly push it back toward a monolithic design.

I would also benefit from feedback on how to present progress from smaller refinement milestones. This period had real technical value, but the work was more about efficiency, simplification, and maintenance than about a large new user-facing feature.

---

## 5. Self-Evaluation

### How would you rate your performance for this milestone, and why?

I would rate my work as 8.7 out of 10. This was not the biggest milestone in terms of raw feature count, but I think it was a strong period of disciplined engineering work.

I kept the app current by adding new model options, I simplified part of the MIDI handling logic, and I made a meaningful performance improvement that reduced first-load JavaScript across the main pages. I also kept tests in step with the code and verified the project after the refactor.

I am not rating it higher because this period was narrower in scope than the previous milestone, and some of the most valuable work was local refactoring rather than a large new feature. Still, I think this was a good milestone because it improved the quality of the project in ways that matter for the long term.

---

## 6. Evidence of Work

### Attach or link to supporting evidence (e.g., screenshots, URLs, customer feedback, testing scripts, design diagrams, commit history, video demonstration, etc.) that demonstrates your contributions during this reporting period.

The main evidence is the git history after the last milestone report commit, `a15c127`, on March 17, 2026. The repo shows four follow-up commits during this reporting period: `4743766` for GPT-5.4 mini and nano model support, `3f2b147` for the Hunter Alpha model and a related picker UI test update, `5a554e8` for Claude Sonnet 4.6 plus simplification of MIDI snap handling, and `2eebfa4` for the MiniMax M2.5 model and an added validation test.

The committed diff summary since that report shows 8 files changed, with 57 insertions and 30 deletions. The main committed files were `constants.ts`, `spec.md`, `tests/input-form.ui.test.tsx`, `tests/validation.test.ts`, `hooks/generator/useAttemptGeneration.ts`, `hooks/generator/useAttemptPlayback.ts`, `hooks/generations/useGenerationsPlayback.ts`, and `hooks/useGenerationsPage.ts`.

The current workspace also includes uncommitted work completed on April 5, 2026. This local refactor adds new MIDI utility modules and updates the playback and download flow in `utils/midiUtils.ts`, `utils/midiMath.ts`, `utils/midiData.ts`, `utils/midiExportImpl.ts`, `utils/midiPlaybackImpl.ts`, `utils/midiDownload.ts`, `components/PianoRoll.tsx`, `components/GeneratorApp.tsx`, `components/AttemptCard.tsx`, `components/ExpandedAttemptModal.tsx`, `components/landing/LandingPlaybackDemo.tsx`, and related test files.

The technical evidence for this local work is strong. The full project passes `npm run lint`, `npm run typecheck`, and `npm run test:run`, with all 31 test files and 241 tests passing. A production build also succeeds and shows reduced first-load JavaScript: about 253 kB down to 185 kB on `/`, 250 kB down to 182 kB on `/generations`, and 188 kB down to 120 kB on `/landing`.

---

## 7. Additional Comments

This milestone was smaller, but it was still important. The previous report focused on broad UI refinement. This one shows a shift toward maintenance, model support, and efficiency work.

That feels like a natural next step for the project. Once an application reaches a more complete state, progress is not only about adding features. It is also about keeping the tool current, simplifying code that has become awkward, and improving performance so the app stays responsive as it grows.

This period helped move the project in that direction.
