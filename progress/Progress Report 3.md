# Milestone Report

**Name:** Kaden Barthlome
**Reporting period:** from February 23, 2026 to March 14, 2026
**Total hours worked on this project:**
**Total Hours worked during this milestone report:**
**Number of Credits enrolled:**

---

## 1. Milestone Goals vs. Accomplishments

### What tasks did you plan to complete during this period?

My goal for this period was to make the app better to use. The last report covered big new parts, like login, saved work, and the piano roll. This time, I planned a polish pass. I wanted the app to look cleaner. I wanted it to feel smoother. I also wanted users to find models faster, move through the app with less effort, and hit fewer small problems.

I did not plan a large backend change. I planned to refine what I had already built. That meant better UI polish, better theme behavior, better login and account flow, better keyboard use, and a careful check for regressions. My goal was to make the project feel more solid and more mature.

### What tasks did you actually complete?

I completed a milestone that was mostly about polish, ease of use, and cleanup. After the last report commit on February 23, the repo shows 23 new commits across seven work days. In that span, I changed 42 files with 2,741 insertions and 957 deletions. This work was spread across the landing page, auth screens, the generator form, shared UI parts, and test files.

I added a theme toggle. I also improved theme handling in the piano roll and other parts of the app. I refreshed the landing page and the auth UI. I added rotating landing captions, then later fixed and refined that behavior so it worked better.

I spent a lot of time on the main generator form. I upgraded the input form with grouped model choice, model search, and a better layout. I added GPT-5.4 to the model list. I also improved keyboard navigation in the model picker, which made the larger list easier to use.

I improved account and login flow too. I added duplicate account handling. I added a reset password page. I also added a guide for users who need to set up an OpenRouter key. I made the options menu close on generate, which removed one small point of friction.

I also made many visual fixes. I replaced the login logo with MIDI image assets. I improved and then fixed the "Improve prompt" border effect. I changed blob colors and login/reset styling, then later rolled back one style direction when it did not look right. I centered the MIDI and generation cards and cut back extra motion so the UI felt calmer.

This period also included cleanup work. I reviewed duplicate code in `ExpandedAttemptModal`. I added shared UI parts such as `BrandLogo`, `CompositionPlaybackDetails`, and `OverlayModal`. I ran a regression review pass. I removed the Tailwind line-clamp plugin. I also updated tests for the generator app, input form, and validation. In short, this milestone was not about big backend work. It was about making the app easier to use, easier to read, and easier to maintain.

---

## 2. Learning and Application

### What new knowledge or skills did you gain during this period?

I learned more about frontend polish. Small UI choices had a big effect on the whole app. I got more practice with theme state, menu state, motion, layout, and shared UI behavior.

I also learned more about keyboard access. The model picker made that clear. As the model list grew, I had to think about search, grouping, focus, and how a user moves through the list with keys. That helped me think more about accessibility in a practical way.

I also learned more about design consistency. In this period, I worked on the landing page, login page, reset page, and generator view. That pushed me to think about the app as one product, not just a set of screens.

### What have you applied from your coursework to your project?

I applied iterative design. I did not stop at the first version of a UI change. I added a change, checked it, and refined it when needed. The caption work, the motion fixes, and the style rollback all came from that process.

I also applied modular design. When I found repeated UI code, I split it into shared parts like `BrandLogo`, `CompositionPlaybackDetails`, and `OverlayModal`. That made the code easier to update.

I also applied testing and validation. As I changed shared UI code, I updated `tests/input-form.ui.test.tsx`, `tests/generator-app.ui.test.tsx`, and `tests/validation.test.ts`. That helped me make changes with more confidence.

---

## 3. Challenges and Problem-Solving

### What difficulties or mistakes did you encounter?

One challenge was keeping the UI coherent as the app grew. By this point, many screens shared the same styles and parts. A small change in one view could affect another view. That made polish work harder than it first looked.

Another challenge was balance. I wanted the app to feel active, but not busy. Some motion and style choices looked good at first, but felt too heavy in use. This came up with the landing captions, the prompt border effect, and some login and reset styling.

I also had to deal with edge cases. Duplicate account flow and reset password flow needed to be clear. The larger model list also made model choice harder to scan and harder to use.

### How did you address or attempt to correct them?

I made small, focused updates. I did not try to redo the whole UI at once. That let me see what was helping and what was not.

I also changed course when needed. I refined the landing caption behavior after the first pass. I improved and then fixed the prompt border effect. I also rolled back one style path when it was not working well enough.

Tests and review helped too. I updated tests as I changed the UI. I also did a regression review pass. That gave me a better check on whether the polish work was helping without breaking older features.

### Describe an interesting or challenging problem you faced and how you approached solving it.

One good example was the model picker. Early on, a simple model list was fine. As more models were added, that list got harder to use. Users needed a faster way to scan it, search it, and move through it with the keyboard.

I solved that in steps. First, I grouped models and added search. That made the list easier to scan. Then I improved the layout around the form. Later, I improved keyboard navigation in the picker. I also added GPT-5.4 in this period, which made it even more important that the selector scale well.

This problem fits the whole milestone well. The work was not about a new backend system. It was about making an existing part of the app easier to use and more ready for growth.

---

## 4. Support and Improvement

### What skills or areas would you like help with to perform better on this project?

I would like help with deeper frontend design system work. As the app grows, I want to keep it consistent without making every page feel the same.

I would also like more help with accessibility best practices for custom UI controls. This milestone showed me how much keyboard flow, focus behavior, and clear control design matter.

I would also benefit from help with usability and performance review. The app now has enough UI depth that outside feedback on flow and clarity would be useful.

---

## 5. Self-Evaluation

### How would you rate your performance for this milestone, and why?

I would rate my work as 8.5 out of 10. I did not add as many large new features as I did in the last milestone, but that was not the goal here. This period was about polish, model choice, keyboard access, and regression review.

I think I did well because I improved many parts that shape the day-to-day user experience. The app now has better theme support, a better landing and login flow, a better model picker, cleaner shared UI parts, and stronger tests around the updated interface.

I am not rating it higher because I still have room to grow in design consistency and accessibility. I also spent some time revising or rolling back choices that did not work well enough. Even so, this was a strong milestone because the app feels much more mature now.

---

## 6. Evidence of Work

### Attach or link to supporting evidence (e.g., screenshots, URLs, customer feedback, testing scripts, design diagrams, commit history, video demonstration, etc.) that demonstrates your contributions during this reporting period.

The main evidence is the repo commit history after the last report commit, `f3bd466`, which was added on February 23, 2026. After that point, the repo shows 23 commits across seven active work days: February 25, 26, 27, 28, March 8, March 12, and March 14, 2026. The post-report diff summary shows 42 files changed, with 2,741 insertions and 957 deletions.

Key commits from this period include `4c9ff0a` for the theme toggle, `5d4c5c5` for landing and auth UI updates, `c3a8eee` for grouped model choice, search, layout, and piano roll theme handling, `7d1724e` for landing captions, `8a23ab9` for duplicate account handling, `d4721fe` for the OpenRouter key guide, `aa2dd7b` for closing the options menu on generate, `76ad5e5` for new MIDI branding, `27e0c84` for the GPT-5.4 option, `5e41764` for better keyboard nav in the model picker, `ee7f0e1` for the regression review pass, and `1900686` for removal of the Tailwind line-clamp plugin.

The files changed also show the work done. Key files include `app/login/page.tsx`, `app/reset-password/page.tsx`, `app/globals.css`, `components/InputForm.tsx`, `components/GeneratorApp.tsx`, `components/AppHeader.tsx`, `components/PianoRoll.tsx`, `components/ExpandedAttemptModal.tsx`, `components/ExpandedGenerationModal.tsx`, `components/BrandLogo.tsx`, `components/CompositionPlaybackDetails.tsx`, `components/OverlayModal.tsx`, and the landing page components. The test files `tests/input-form.ui.test.tsx`, `tests/generator-app.ui.test.tsx`, and `tests/validation.test.ts` also show the work from this period.

---

## 7. Additional Comments

This milestone made the app feel more finished. The last milestone added major features. This one made those features easier to use and easier to trust.

This period showed me that small UX choices add up fast. Better model search, better keyboard flow, clearer account handling, cleaner layout, calmer motion, and stronger visual consistency all helped the app. Even without big backend changes, this was a major improvement to the project.
