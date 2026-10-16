# Decisions — progress-tab exam attempts (`courseHome.examsData`) → React Query hook (#2075)

1. **Its own layer, because it is a plugin-contract change, not a slice
   removal.** PR #1829 added the exam attempt fan-out so that "downstream
   plugin slots" could read `state.courseHome.examsData`; nothing in this repo
   reads it (deleting the call fails only the block of tests that inspect the
   store directly), and 2U's fork carries the change
   (edx/frontend-app-learning#38). Converting it changes how a plugin gets the
   data, so it is separated from the rest of the `courseHome` teardown
   (#1975: `proctoringPanelStatus`, the reducer itself), which follows in the
   next layer.

2. **A hook exported from learning's source, not a `pluginProps` addition.**
   `pluginProps` *are* the slot contract, and none of the six progress-tab
   slots ever passed exam data — a plugin could reach it only because plugins
   render inside the app's Redux `Provider`. Threading it through
   `pluginProps` would have made it part of six slots' contracts, which we
   don't want. Operator `env.config.jsx` files already import from `./src/...`
   (the breadcrumbs and sequence-navigation slot READMEs show it), so a plugin
   swaps one line — `useSelector(state => state.courseHome.examsData)` — for
   `useExamsData()` from `./src/course-home/progress-tab/hooks`. Because React
   Query dedupes by key, every plugin on the page shares one fetch with no
   context provider: the query cache does the job the store did.

3. **The fetch is no longer eager.** `ProgressTab` used to fan out one attempt
   request per subsection on every progress-tab load whether or not any plugin
   read the result. Now only `useExamsData()` triggers it, so deployments with
   no plugin reading exam data make zero attempt requests on the progress tab.
   This is a deliberate behavior change beyond the conversion, chosen because
   the hook is self-sufficient (it derives the subsection ids itself) and the
   plugin-side `env.config.jsx` stays a one-line swap either way.

4. **One query, fan-out inside `queryFn`.** `useExamAttemptsData(courseId,
   sequenceIds)` runs `Promise.all` over the ids inside a single `queryFn`,
   producing the same positional array the thunk dispatched — the camelCased
   `exam` object per subsection, `{}` where the api maps a 404, `{}` (after
   `logError`) where a request fails, the rest still resolving. `useQueries`
   would have needed a merge step to recover the positional shape and would
   not have deduped as one unit. Because per-entry failures are swallowed
   inside `queryFn`, the query itself never rejects, so the app retry policy
   never engages — the thunk had no retry either. `Promise.all([])` resolves
   to `[]`, matching `setExamsData([])` for a course with no subsections. No
   `meta`: nothing reads this through `useModel`, so nothing bridges.

5. **The id list is part of the key; `targetUserId` is not.** A progress
   refetch that changes `sectionScores` yields a new key and a fresh fan-out —
   the thunk's "re-dispatch when `sequenceIds` changes" effect expressed as
   cache identity. The attempt endpoints take no user parameter and the thunk
   ignored masquerade too (requests go as the authenticated user), so the key
   is `[..., 'examAttempts', courseId, sequenceIds]`. `enabled` gates on both
   `courseId` and a defined `sequenceIds`, so a plugin calling the hook before
   the progress query resolves gets `null` and no request.

6. **`useExamsData()` returns the array or `null`, never `undefined`.** The
   store path had exactly two states — `null` before the first result, the
   array after — and the hook preserves them (`data ?? null`), so a plugin's
   `if (!examsData)` guard keeps working. It returns data rather than the
   query result, like its sibling `useProgressData()` returns `.data`.

7. **Names.** The query hook is `useExamAttemptsData`, after the thunk it
   replaces (`fetchExamAttemptsData`) and what the endpoint returns (an exam
   *attempt* record) — its `apiHooks.ts` siblings are likewise named for the
   fetch they wrap. The plugin-facing hook is `useExamsData`, after the store
   field plugin authors already know (`examsData`); it lives in
   `progress-tab/hooks.jsx` as a no-argument sibling of `useProgressData()`.
   Review asked whether that file is right, since the hook is callable from
   any slot under a `/course/:courseId/...` route, not just the progress
   tab's. It stays: the path names the data source, not the call sites — the
   subsection list comes from the progress query's section scores, via
   `useProgressData()`, so what the hook computes is "exam attempts for the
   subsections the progress page lists" wherever it is called. The
   alternatives each break a convention: `course-home/data/apiHooks.ts` holds
   argument-taking hooks that never read the route; `src/data/hooks.ts` is
   app-level and route-only (`useContextId`), so a course-home-query-dependent
   hook would pull feature knowledge up a layer; a dedicated plugin-facing
   module is the right long-term home but is a public-surface design question
   tied to the frontend-base port, not something to invent for one hook. If
   such a module materializes, this hook and `useContextId` are its obvious
   first residents.

8. **`deprecatedSaveCourseGoal` / `deprecatedPostCourseGoals` removed as
   forgot-to-remove code.** #664 (2021-10-19) renamed the old goal-picker
   writer `saveCourseGoal` → `deprecatedSaveCourseGoal` while weekly learning
   goals rolled out; #789 (2022-01-10, "remove deprecated goals feature")
   deleted both callers (`DeprecatedCourseGoalCard.jsx`,
   `UpdateGoalSelector.jsx`) but left the thunk, its api function, the
   `course-home/data/index.js` re-export, and its `redux.test.js` case.
   Nothing has touched it since. A removal commit that missed pieces, not a
   "who uses this" question — so it rides along here.

9. **`course-home/data/thunks.js` deleted; `eventTypes` moves beside
   `messageTypes`.** With `fetchExamAttemptsData` and `deprecatedSaveCourseGoal`
   gone the file held only `eventTypes`, whose sole importer is the iframe
   `POST_EVENT` guard in `useIFrameBehavior.ts`. A `thunks.js` with no thunks
   is the wrong home, so the constant now lives in
   `courseware/course/sequence/Unit/constants.ts` next to `messageTypes`, the
   other iframe postMessage vocabulary that hook already imports from there
   (a first draft parked it in `apiHooks.ts` beside `usePostEvent`; review
   moved it — a hooks module shouldn't grow a non-hook export). Whether the
   constant is needed at all is a separate question left open.
   `redux.test.js` (only the two deleted thunks' cases) and `slice.test.js`
   (only `setExamsData` cases) emptied out and were deleted; the slice keeps
   `fetchProctoringInfoResolved`, untested before and after.

10. **Store-inspection tests replaced by hook tests plus a real plugin-slot
    integration test.** The six-test `Exam data fetching integration` block
    in `ProgressTab.test.jsx` asserted requests `ProgressTab` no longer makes
    and read `store.getState().courseHome.examsData`, which no longer exists.
    Its coverage moved: the fan-out semantics (order, `{}` holes, logged
    failure, empty list, disabled until ids are known) to
    `apiHooks.test.tsx`; the id derivation, `null`-before-load, and re-fetch
    on changed section scores to `hooks.test.jsx` (which seeds the progress
    query with `seedQueryData` instead of mocking `react-redux` and the
    thunk). `ProgressTab.test.jsx` gained the in-repo mirror of the
    `env.config.jsx` probe: `setConfig({ pluginSlots })` with a `DIRECT_PLUGIN`
    widget calling `useExamsData()` in the course-grade slot, asserting the
    widget renders the fetched names and that with no plugin configured zero
    attempt requests are made. The shared `setupTest.js` stubs
    `@openedx/frontend-plugin-framework` with a `PluginSlot` that ignores
    config, so that file `jest.unmock`s the framework; nothing in it relied
    on the stub's `data-testid` markup. The new block's `beforeEach` calls
    `axiosMock.reset()` and re-registers the base handlers before its exam
    mocks: the file's outer `beforeEach` ends with `logUnhandledRequests`,
    whose `onAny` catch-all answers every unmatched request with an empty 200,
    and axios-mock-adapter matches handlers in registration order — so
    handlers added later never match. Keeping a placeholder progress handler
    ahead of the catch-all matters too, because `setTabData` replaces a
    same-matcher handler in place rather than appending.

11. **Test-environment errors carry explicit `customAttributes`.** The mocked
    http client has no error interceptor, so a bare `reply(404)` produces an
    error without `customAttributes`, and `getExamsData`'s catch
    (`const { httpErrorStatus } = error && error.customAttributes`) then
    throws a TypeError — the old thunk-based tests "passed" the 404 case only
    because the thunk's outer catch swallowed that TypeError into `{}`. The
    new tests build the error shape by hand (`customAttributes.httpErrorStatus`),
    as `api.test.js` already did, so the `{}` hole comes from the api's real
    404 branch and the logged-failure case logs exactly once. The api's
    fragility on interceptor-less errors is pre-existing and untouched.

12. **`logError(error as Error)` in the `queryFn` catch.** The caught value is
    `unknown`; the http client rejects with an axios `Error`, and
    frontend-platform's `logError` takes `string | Error`, so a structural
    cast to `Error` is the precise narrowing. No `any`.

13. **Documented in a new `progress-tab/README.md`, deliberately nowhere near
    the slots.** A first draft put an `env.config.jsx` example in the six
    progress-tab slot READMEs. Review dropped that: the hook is callable from
    any slot under a `/course/:courseId/...` route (it fetches the progress
    data itself if it isn't cached), so it is not scoped to those slots, and
    an example in a slot's README would read as a soft addition to that slot's
    contract — the very thing the `pluginProps` decision avoids. The repo
    already documents a non-slot plugin contract as a feature-directory
    README with `env.config.jsx` examples (`courseware/course/sidebar/README.md`
    for `SIDEBAR_WIDGETS`), so the example lives beside the hook in
    `course-home/progress-tab/README.md`, framed as data the progress tab
    makes available to plugins; the slot in its example is named only as
    where the widget renders. No pointer from the plugin-slots index either.
    The commit's `BREAKING CHANGE:` footer and the PR body carry the
    old-path → new-import note.

14. **Breaking-change marking follows #2016.** The Redux read stops working
    for any plugin using it, so the commit carries a `refactor!:` subject and
    a `BREAKING CHANGE:` footer naming the old store path and the new import;
    the PR body says the same and tags the #1829 author.

15. **`executeThunk` deleted from `src/utils.ts` (codecov).** The draft PR's
    codecov project check dropped 0.05% with one new miss and one new partial.
    Codecov's compare showed the real change: `src/utils.ts` went from 0 to 2
    misses — `executeThunk` is a test-only helper (its own docblock said so),
    and the deleted `redux.test.js` was its last importer, so its two lines
    became dead code with no test executing them. Same pattern as the
    live-tab layer (#2006): a deletion-heavy PR orphans code elsewhere, and
    the fix is to delete the dead code, not pad coverage. Nothing in `src`
    references it now. The other movement in the report — one miss becoming
    one partial in `CoursewareContainer.tsx`, a file this PR doesn't touch —
    is run-to-run variance in the known flaky container tests and nets to
    zero.
