# frontend-app-learning

Repo facts that outlive any one effort. The repo's own terms are in `GLOSSARY.md` beside this file; effort-specific material lives on that effort's branch.

## Tutor dev

- No `EXAMS_BASE_URL`: exam requests hit `openedx-platform`'s `edx_proctoring` URLs, which answer a non-exam subsection with 200 and `{"exam": {}}`.
- `ENABLE_SPECIAL_EXAMS` is off by default; a real timed exam needs a tutor plugin patch on `openedx-common-settings` plus the course's "Enable Timed Exams". Proctored states are mocked; no third-party proctoring software locally.
- A missed suggested-schedule deadline: self-paced course, `relative_dates` waffle, graded subsections, backdated `Schedule.start_date`; `dates_banner_info` diagnoses it.

## Plugin contracts

- `courseHome.examsData` is an intentional plugin contract (PR #1829) with no in-repo reader.
- The plugin-store `registerOverrideMethod` consumer is the npm package `@edx/unit-translation-selector-plugin` (source private); check the tarball, not code search.
- `useMinimalCourseOutline` and `useCourseOutlineStructure` are settled names.

## Lockfile

- A fresh `npm install` hoists an ESM-only react-intl 10 (Paragon's peer range allows it; frontend-platform pins 6.8.9) that breaks every Jest suite. `npm dedupe` after the install collapses it to 6.8.9 (#2042); it also removed a hoisted jest 30 on master in 2026-10.

## Local dev

- `env.config.jsx` is untracked; a stale copy explains a cross-checkout runtime difference before the code diff does.
- frontend-lib-special-exams is developed against a sibling checkout through a gitignored `module.config.js` alias; the alias hides dist packaging bugs, so the final manual pass of any lib-bump layer runs without it.
