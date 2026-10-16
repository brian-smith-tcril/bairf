# Manual testing — smoke test of v5 in learning (#2168)

A short in-browser pass over #2168 (learning on
`@edx/frontend-lib-special-exams` 5.0.0) against tutor local. The
HTTP-boundary tests already cover the exam states; this only checks what they
can't: the real app wiring (learning's `SpecialExamsProvider` in `Sequence`
and `TabWithTimer`, no redux store, the slot rendered by learning) against
the real LMS, with the dev server resolving the installed package.

## Setup

- Learning on `bsmith/special-exams-v5`, `npm ci`, then `npm run dev`.
  Move `module.config.js` aside first: with it present the dev server
  aliases the library to the sibling checkout's source instead of the
  installed package.
- The timed DemoX subsection and learner from the baseline's setup
  (`manual-testing-2018.md`, Setup steps 1–4); give it a fresh short time
  limit or a new learner if the old attempt is already submitted.
- Devtools Console open throughout; Network filtered to
  `proctoring|attempt`.

## Checks

- [x] **1. Non-exam unit.** Open any non-exam DemoX unit as the learner →
  it renders; no console errors (in particular nothing from react-redux or
  "SpecialExamsProvider is required").
- [x] **2. Course-home tab, no attempt.** Open Progress or Dates → the page
  renders with no exam timer and no console errors.
- [x] **3. Timed exam start.** Open the timed subsection → entrance page;
  start it → the unit renders with the timer above it.
- [x] **4. Outer timer.** With the attempt running, open Progress → the exam
  timer shows there too.
- [x] **5. Submit.** Back in the exam: End My Exam → "Yes, submit my timed
  exam." → "You have submitted your timed exam." (the default heading, now
  rendered through learning's slot).
- [x] **6. Staff.** Open the timed subsection as staff → the unit renders
  with no exam instructions or timer.

## Results

2026-10-14: all six checks passed, run against tutor local with the dev server
resolving the installed 5.0.0 package.
