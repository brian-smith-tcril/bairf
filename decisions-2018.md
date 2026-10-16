# Decisions — adopt `@edx/frontend-lib-special-exams` v5 (#2018)

Layer 2 of the #2018 stack on `master`, above the HTTP-boundary tests
(#2163). Replaces the library with v5 (openedx/frontend-lib-special-exams#176,
published as 5.0.0); the redux packages leave in the layer above. The
shape was settled in `plan-2018.md` ("Learning side", "Sequencing"); the
entries below record it as built and what building it
decided (2026-10-09).

1. **v5 comes from the published `@edx/frontend-lib-special-exams` 5.0.0**
   (`^5.0.0`). The lock change is that entry plus the v4 dependencies it no
   longer pulls in (frontend-plugin-framework's tree among them): a targeted
   update from layer 1's lock with `node_modules` deleted first, not a
   regeneration, which the teardown layer does.
2. **Learning's `SpecialExamsProvider` fills the library's provider**
   (`src/generic/special-exams/SpecialExamsProvider.tsx`; it imports the
   library's as `LibrarySpecialExamsProvider`): `getConfig()` mapped to the
   camelCase `config` (`getSpecialExamsConfig`, also used by the test
   setup's backend mock), `getAuthenticatedHttpClient()`, frontend-platform's
   `logError`, and `isAuthenticated` from `AppContext`'s
   `authenticatedUser`. It shares the library's name because it sits in the
   tree like learning's other `XProvider`s and, inside learning, is the
   special exams provider. No `useMemo` on `config` (review 2026-10-09): it
   re-renders only when `AppContext` changes (sign-in, config, locale, the
   Paragon theme loading at startup), where a fresh `config` costs a
   re-render of the library's components and no refetch or effect, and
   reading `getConfig()` on each render follows a runtime `CONFIG_CHANGED`,
   which a `[]` memo would have missed.
   **Mounted where the library is used**, not at the app root (review
   2026-10-09): around `SequenceExamWrapper` in `Sequence` (whose children
   hold the unit, so `useExamAccess` is covered; the unit renders nowhere
   else in `Sequence`) and around `OuterExamTimer` in `TabWithTimer`. The two
   are on disjoint routes, so no page mounts it twice; the query cache
   belongs to the root `QueryClient` either way. This follows the #1905
   tabs-as-apps shape, where each app mounts what it needs, and keeps
   `index.jsx` and the seven tests that build their own `AppProvider` tree
   to the store removal alone. `SequenceContent.test` and `Unit/index.test`
   render a piece of `Sequence`'s tree without `Sequence`, so they mount
   the provider in their render helpers.
3. **The store is gone.** `src/store.ts`, `AppProvider`'s `store` prop and the
   test `render`'s `store` option go; 15 test files drop their
   `initializeStore()` (and `Sequence.specialExams.test.tsx` the `{}` left
   where `{ store: initializeStore() }` was; review 2026-10-15). With no
   store `AppProvider` renders no react-redux `Provider`, so a plugin calling
   `useSelector` or `useDispatch` now throws: the commit carries the `!`. The
   only in-repo state left in redux was the library's `specialExams` slice;
   the plugin store had already moved to `@src/generic/plugin-overrides`.
   `LearnerToolsSlot`'s README and comment told plugins to query the Redux
   store; they say backend APIs and config instead (review 2026-10-15: this
   is the layer where the store stops being reachable, so the rewording moves
   down from #2180, which only removes the packages; naming the query hooks
   in that README was considered and decided against while doing #2180).
4. **The backend mock comes from the library.** `src/tests/mockSpecialExams.ts`,
   its test and `src/tests/specialExamsFactories.ts` are deleted;
   `mockCourseRequests` calls `mockSpecialExams` from
   `@edx/frontend-lib-special-exams/testing` with `getSpecialExamsConfig()`,
   and the exam test imports `ExamScenario` from there (lib decision 0b.5). The
   library's mock is learning's moved, so the scenarios and recorded requests
   are unchanged. Jest's mapper for the package is anchored
   (`'^@edx/frontend-lib-special-exams$'`): unanchored it also matched the
   `/testing` subpath and resolved it to the package root (lib decision 0b.7).
5. **`useExamAccess` collapses to the two remaining hooks** and is TypeScript,
   having been rewritten: `{ blockAccess: isExam && isPending, accessToken }`.
   It no longer takes the unit id: `Unit` is keyed by unit id, so each unit
   mounts its own token query and refetches as `staleTime: 0` (D3), which is
   today's fetch on every unit change, and the library's `isPending` covers
   that refetch, so each unit waits for its own token as in v4 (settled in
   review, lib decision 3.7). The test is rewritten around the two mocked
   hooks: not an exam, pending, token arrived, exam with no token
   needed. Errors are logged by the library now, not here.
6. **Learning owns the submitted-timed-exam slot.**
   `src/plugin-slots/SubmittedTimedExamInstructionsSlot/` is the library's old
   slot component without `useSelector`: `timeIsOver` arrives as the prop
   `SequenceExamWrapper` passes its `submittedTimedExamInstructions`
   component, the slot id is unchanged
   (`org.openedx.frontend.special_exams.submitted_timed_exam_instructions.v1`),
   and the default heading keeps the library's message ids so the existing
   translations apply. The README and its three screenshots come from the
   library's history; the "Course Outline button" example read the course id
   from the redux store, which no longer exists, and now uses
   `useParams()`. The slot is listed in `src/plugin-slots/README.md`.
7. **Slot host test** (`index.test.tsx`, plan-2018): FPF unmocked, a
   `DIRECT_PLUGIN` configured for the slot id that prints the `timeIsOver` it
   received, and learning's `Sequence` rendered with the library's backend
   mock, so the path is `Sequence` → `SequenceExamWrapper` →
   `SubmittedInstructions` → this slot → FPF → plugin. Cases: submitted on
   request (plugin shown, default absent, `timeIsOver: false`), submitted by
   the timer (`timeIsOver: true`), and `keepDefault: true` (plugin beside the
   default heading). The fake timers are drained and the clock restored in
   `afterEach`, as `Sequence.specialExams.test.tsx` does, so a timed-out
   `findByText` cannot leave the next case on fake timers (review 2026-10-15;
   the first cut did both at the end of the timer case).
8. **The exam tests take the five adaptations** recorded in plan-2018
   ("Exam test adaptations found by running `Sequence.specialExams.test.tsx`
   against the v5 queries"): a non-exam sequence asks for the latest attempt
   and never the exam; the different-sequence timer is awaited; the
   masquerade unit is awaited behind its token; the probe reply is awaited
   before the fake timeout; and fake timers are drained before the clock swap.
   One assertion tightens: "when time runs out › submits the exam itself"
   expected one submit per timer mounted earlier in the file because v4 never
   removed its `TIMER_LIMIT_REACHED` listener; v5 does (lib decision 2.5), so
   it now expects exactly `['submit']`.
9. **Verification** (on 5.0.0, with entry 10's test): lint and types
   clean; 124 suites, 1,279 tests pass; `npm run build` compiles with
   webpack's two usual asset-size warnings.
10. **`CourseLicense` gains a test** (`CourseLicense.test.tsx`; review
    2026-10-09). The layer deletes 121 fully covered lines (learning's copy of
    the backend mock and its factories, the old `useExamAccess`, `store.ts`)
    and adds none uncovered, so the same 246 misses became a larger share and
    Codecov's project check, at a 0% threshold, failed (95.85% → 95.76%).
    `CourseLicense`, which `Sequence` renders beside `SequenceExamWrapper` in
    the block this layer edits, had no test and the most uncovered lines in
    the app (23). Five cases cover the license strings Studio produces: none
    (the default prop), all rights reserved, Creative Commons with terms and a
    version, terms without a version (4.0 by default), and no terms (CC0 1.0).
    One line stays uncovered, `parseLicense`'s `!license` fallback:
    `Sequence`, the only caller, passes `license || undefined`, so a missing
    license always arrives through the default prop.
