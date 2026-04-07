# Milestone Report

**Name:** Kaden Barthlome
**Reporting period:** from March 14, 2026 to April 5, 2026
**Total hours worked on this project:** 80
**Total Hours worked during this milestone report:** 20
**Number of Credits enrolled:** 2

---

## 1. Milestone Goals vs. Accomplishments

### What tasks did you plan to complete during this period?

According to my original proposal, this final period was supposed to focus on export, polish, and project completion. The main goals listed for the April 5 milestone were MIDI export, WAV export, audio effects or instrument selection, user authentication and composition saving, UI refinement, and complete documentation. The proposal also described the final demo as a full workflow from prompt to generation, editing, and export.

By the start of this reporting period, some of those goals were already partly in place. Authentication, saved generations, MIDI playback, and a piano roll visualization were already working. Because of that, my practical goal for this period became finishing the strongest parts of the application, keeping the model support current, simplifying parts of the MIDI pipeline, and improving performance and polish so the app felt more complete by the final deadline.

### What tasks did you actually complete?

I completed a final milestone centered on completion work, refinement, and alignment with the parts of the proposal that proved most valuable in practice. During this period, I added GPT-5.4 mini and GPT-5.4 nano, then added Hunter Alpha, Claude Sonnet 4.6, and MiniMax M2.5. This extended the LLM side of the project beyond the original foundation by making the generator more flexible and more current with newer model choices.

I also simplified the MIDI snapping path. This reduced extra logic in generation and playback code and made the behavior easier to maintain. That was useful because the application had reached a point where code clarity mattered as much as adding another feature.

The largest technical improvement in this milestone was performance work. I split the MIDI utility layer into smaller modules so playback and export code no longer had to be loaded up front on every page. I moved Tone.js playback logic and MIDI export logic behind lazy imports, changed MIDI file generation so blobs are only built when the user actually downloads, and refactored the piano roll so the static visualization and the moving playhead are drawn separately. This reduced unnecessary rendering during playback and reduced the amount of client JavaScript loaded on the main pages.

This work produced a clear build improvement. The first-load JavaScript dropped from about 253 kB to 185 kB on the main generator page, from about 250 kB to 182 kB on the generations page, and from about 188 kB to 120 kB on the landing page. That means the final milestone was not only about adding polish, but also about making the finished app leaner and more responsive.

When I compare the current project against the original proposal, several major goals are complete. The app is built in Next.js, uses OpenRouter for generation, uses Supabase for authentication and saved generations, supports real-time playback, includes a custom piano roll visualization, exports MIDI files, and has gone through several rounds of UI refinement and testing. The full proposal scope, however, was broader than the final build. The proposal described a full piano roll editor with drag, resize, note creation, quantization, and undo/redo, plus WAV export, audio effects, and richer transport controls such as pause and seek. The final application does not fully implement that editor-heavy scope. Instead, the project became strongest as an AI-powered MIDI generation tool with authentication, generation history, playback, visualization, MIDI export, and a more polished user experience.

---

## 2. Learning and Application

### What new knowledge or skills did you gain during this period?

I learned more about finishing work. Earlier milestones were driven by big features. This milestone was more about deciding what to strengthen, what to simplify, and what not to expand further. That required better judgment about scope, maintainability, and performance.

I also learned more about frontend performance in a practical way. This included bundle-size awareness, lazy loading, avoiding unnecessary work during rendering, and recognizing when a component structure causes extra cost even if it is functionally correct.

I also learned more about comparing a real project against an initial plan. The proposal included a very ambitious editing system. As the semester progressed, it became clearer which parts created the most value and which parts would require much more time than expected. This milestone made that tradeoff very visible.

### What have you applied from your coursework to your project?

I applied modular design by breaking the MIDI system into smaller responsibilities instead of leaving everything inside one utility file. That made the code easier to reason about and easier to optimize.

I also applied iterative refinement. Rather than trying to force every proposed feature into the project at the end, I improved the areas that were already core to the app: model support, playback, export, UI polish, and performance.

I also applied testing and validation practice. As I changed models and refactored the MIDI utilities, I updated tests and reran the full suite. That helped me make larger structural changes while keeping the application stable.

---

## 3. Challenges and Problem-Solving

### What difficulties or mistakes did you encounter?

The biggest challenge in this milestone was scope alignment. My proposal described a larger final editor than what the project ultimately became. Features like drag-to-edit notes, edge resizing, undo/redo, quantization controls, WAV export, and audio effects are each substantial pieces of work on their own. Trying to add all of them at the end would have risked weakening the parts of the app that were already working well.

Another challenge was that some of the most important remaining work was not flashy. Performance refactors and code simplification do not always look as dramatic as a new feature, but they matter to the final quality of the project.

I also had to balance growth of the model list with simplicity in validation and UI behavior. As more model options were added, the app needed to stay organized and predictable.

### How did you address or attempt to correct them?

I addressed the scope challenge by focusing on the strongest path through the proposal rather than trying to force complete parity with every planned feature. I kept building toward the intended product direction, but I prioritized the pieces that best supported a working end-to-end system: prompt input, generation, playback, visualization, authentication, saving, MIDI export, and UI quality.

I addressed the performance issue by treating it as real engineering work instead of optional cleanup. I split the utility modules, delayed heavy imports until needed, and reduced repeated rendering work in the piano roll.

For model growth, I made smaller updates and kept tests in sync, which let the app expand without introducing large regressions.

### Describe an interesting or challenging problem you faced and how you approached solving it.

The most interesting problem in this milestone was deciding how to treat the proposal’s original editor scope. The proposal emphasized a custom piano roll editor with note manipulation, quantization, undo/redo, and deep transport controls. In the actual project, the piano roll became a strong visualization and playback aid, but not a full DAW-style editor.

Instead of trying to add incomplete versions of many editing features at the end, I focused on making the existing workflow better. I improved playback efficiency, reduced initial load cost, kept model support current, and refined the overall user experience. That meant the final product stayed closer to a polished AI MIDI generator than to a complete browser-based MIDI workstation.

This was an important lesson in project management. A proposal should be ambitious, but the final engineering decision still has to be based on time, complexity, and what creates the strongest finished result.

---

## 4. Support and Improvement

### What skills or areas would you like help with to perform better on this project?

I would like more guidance on estimating the cost of interactive editor features earlier in a project. The proposal-level idea of a piano roll editor made sense conceptually, but implementing a strong editing experience from scratch is a larger commitment than a basic visualization and playback system.

I would also like deeper help with frontend performance profiling. I made meaningful improvements in this milestone, but I would benefit from stronger habits around measuring bundle impact and render cost earlier instead of waiting until late in the project.

I would also like more feedback on how to scope independent study proposals so that they stay ambitious while leaving enough room for refinement and testing near the end.

---

## 5. Self-Evaluation

### How would you rate your performance for this milestone, and why?

I would rate my work as 8.5 out of 10. I did not achieve every feature listed in the original proposal, especially the full editor and WAV export path. Because of that, I do not think it would be accurate to score this period as perfect completion of the planned scope.

At the same time, I think this was a strong and responsible final milestone. I kept the project moving, added current model support, simplified important code paths, improved performance in measurable ways, and left the application stronger as a finished product. The app now supports a complete and useful workflow: a user can log in, enter a prompt, generate music with multiple models, play it back, visualize it in the piano roll, save generations, revisit them later, and export MIDI files.

I think that result shows solid engineering judgment even though the final build is narrower than the original proposal.

---

## 6. Evidence of Work

### Attach or link to supporting evidence (e.g., screenshots, URLs, customer feedback, testing scripts, design diagrams, commit history, video demonstration, etc.) that demonstrates your contributions during this reporting period.

[GitHub Repository](https://github.com/pliedpiper/ai-midi-generator)

The git history for this reporting period shows the following commits after the prior milestone report: `4743766` for GPT-5.4 mini and nano support, `3f2b147` for Hunter Alpha and a picker test update, `5a554e8` for Claude Sonnet 4.6 and simplified MIDI snap handling, `2eebfa4` for MiniMax M2.5 and validation updates, and `100a721` for optimizing MIDI loading and piano roll rendering.

The current project state also shows where the proposal goals were achieved. The application includes Next.js architecture, OpenRouter-based LLM generation, Supabase authentication and saved generations, custom piano roll visualization, synchronized playback, MIDI export, error handling, and repeated UI refinement. The project passes `npm run lint`, `npm run typecheck`, and `npm run test:run`, with all 31 test files and 241 tests passing. A production build succeeds and reports reduced first-load JavaScript after the performance refactor.

The main files that show the final milestone work include `constants.ts`, `tests/input-form.ui.test.tsx`, `tests/validation.test.ts`, `utils/midiUtils.ts`, `utils/midiMath.ts`, `utils/midiData.ts`, `utils/midiExportImpl.ts`, `utils/midiPlaybackImpl.ts`, `utils/midiDownload.ts`, `components/PianoRoll.tsx`, `components/GeneratorApp.tsx`, `components/AttemptCard.tsx`, `components/ExpandedAttemptModal.tsx`, `components/landing/LandingPlaybackDemo.tsx`, and the related hooks for generation and playback. 

---

## 7. Additional Comments

This report is probably the clearest example of the difference between a proposal and a finished project. The proposal set a broad, ambitious target that included a much deeper editor and export system. The final application took shape around the parts that proved strongest and most useful: AI-assisted generation, structured MIDI output, playback, piano roll visualization, saved history, authentication, export, and polish.

I think that still represents strong progress from the original plan. The project did not fully become a browser-based MIDI editor, but it did become a functional, tested, and more polished AI MIDI generation application. That is a meaningful result, and this final milestone helped make that result more complete and more stable.
