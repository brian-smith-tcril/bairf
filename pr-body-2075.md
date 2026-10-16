## Summary

Convert the progress tab's exam attempt fan-out from a Redux thunk into a React Query hook, and give plugins a supported way to read it: `useExamsData()` from `./src/course-home/progress-tab/hooks` replaces reading `state.courseHome.examsData`. PR #1829 added the fetch so that plugins in the progress-tab slots could read exam attempt status; nothing in this repo reads it, and 2U's fork carries it (edx/frontend-app-learning#38). Part of the Redux → React Query migration (#1946, Stage 1) and the `courseHome` slice teardown (#1975), stacked on the courseware teardown #2074. Closes #2075.

The Redux-side baseline this was measured against — an `env.config.jsx` probe in every progress-tab slot and what it rendered — is recorded in [the issue comment](https://github.com/openedx/frontend-app-learning/issues/2075#issuecomment-5708115316).

## Breaking change

`state.courseHome.examsData` no longer exists. A plugin that read it with `useSelector` must import `useExamsData` from `./src/course-home/progress-tab/hooks` and call it with no arguments; it returns the same positional array (one entry per subsection in section-score order, `{}` where there is no attempt record) or `null` before the first result. `pluginProps` are the slot contract and were deliberately left alone — the exam data was never part of them. The commit carries a `refactor!:` subject and a `BREAKING CHANGE:` footer (semantic-release major).

Before this PR, the following example `env.config.jsx` would work (it is the probe used to record the Redux-side baseline on #2075):

<details>
<summary>env.config.jsx before this PR</summary>

```jsx
import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';
import { useSelector } from 'react-redux';

// Baseline for the examsData plugin contract (PR #1829): a plugin in any progress-tab
// slot reads `state.courseHome.examsData` straight out of the Redux store. One probe
// widget, inserted into every slot on the progress page, so we can see exactly what a
// plugin can get at today before the courseHome slice goes.
const ExamsDataProbe = ({ slotLabel, ...pluginProps }) => {
  const examsData = useSelector(state => state.courseHome.examsData);
  const exams = (examsData ?? []).filter(exam => exam.id !== undefined);

  return (
    <div style={{ border: '2px dashed #c33', padding: '0.5rem', margin: '0.5rem 0', fontSize: '0.8rem' }}>
      <strong>{slotLabel}</strong>
      {' '}
      pluginProps: <code>{JSON.stringify(pluginProps)}</code>
      <div>
        examsData: {examsData === null ? 'null (not fetched yet)' : `${examsData.length} entries, ${exams.length} with an exam`}
      </div>
      {exams.length > 0 && (
        <ul style={{ margin: 0 }}>
          {exams.map(exam => (
            <li key={exam.id}>
              {exam.examName} — {exam.attemptStatus ?? 'no attempt'} ({exam.contentId})
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>raw</summary>
        <pre style={{ fontSize: '0.7rem' }}>{JSON.stringify(examsData, null, 2)}</pre>
      </details>
    </div>
  );
};

const probeSlot = (slotId, slotLabel) => ({
  [slotId]: {
    plugins: [
      {
        op: PLUGIN_OPERATIONS.Insert,
        widget: {
          id: `exams_data_probe_${slotLabel}`,
          type: DIRECT_PLUGIN,
          RenderWidget: (pluginProps) => <ExamsDataProbe slotLabel={slotLabel} {...pluginProps} />,
        },
      },
    ],
  },
});

const config = {
  pluginSlots: {
    // Every slot rendered by ProgressTab.jsx, in page order, plus the one nested inside
    // CertificateStatus (only renders when a certificate card is shown).
    ...probeSlot('org.openedx.frontend.learning.progress_tab_course_completion.v1', 'course_completion'),
    ...probeSlot('org.openedx.frontend.learning.progress_tab_certificate_status_main_body.v1', 'certificate_status_main_body'),
    ...probeSlot('org.openedx.frontend.learning.progress_tab_course_grade.v1', 'course_grade'),
    ...probeSlot('org.openedx.frontend.learning.progress_tab_grade_breakdown.v1', 'grade_breakdown'),
    ...probeSlot('org.openedx.frontend.learning.progress_tab_certificate_status_side_panel.v1', 'certificate_status_side_panel'),
    ...probeSlot('org.openedx.frontend.learning.progress_tab_related_links.v1', 'related_links'),
    ...probeSlot('org.openedx.frontend.learning.progress_certificate_status.v1', 'certificate_status_card'),
  },
}

export default config;
```

</details>

After this PR it needs these two lines changed:

```diff
-import { useSelector } from 'react-redux';
+import { useExamsData } from './src/course-home/progress-tab/hooks';
 ...
-  const examsData = useSelector(state => state.courseHome.examsData);
+  const examsData = useExamsData();
```

One further behavior change: the attempt requests (one per subsection) now fire only when a plugin calls the hook. With no plugin reading the data the progress tab makes none, where it used to make one per subsection on every load.

## What changed

- **`course-home/data/apiHooks.ts`: `useExamAttemptsData(courseId, sequenceIds)`** — one query whose `queryFn` runs the thunk's `Promise.all` fan-out and resolves to the same array: the camelCased `exam` record per subsection, `{}` where the api maps a 404, `{}` after `logError` where a request fails. The query never rejects, so no retries engage (the thunk had none). The id list is part of the key, so a changed section-score list refetches. `enabled` waits for both `courseId` and a defined id list.
- **`course-home/progress-tab/hooks.jsx`: `useExamsData()`** — the plugin-facing hook: reads the course id from the route, derives the subsection ids from the shared progress query, and returns the attempts array or `null`. Replaces `useGetExamsData`, the effect that dispatched the thunk.
- **`ProgressTab.jsx`** no longer fetches exam data; `ProgressTabContent` keeps only `disableProgressGraph`.
- **Deletions:** `setExamsData` + `examsData` from the `courseHome` slice; `course-home/data/thunks.js` (its last two thunks were `fetchExamAttemptsData` and `deprecatedSaveCourseGoal`, dead since #789 in January 2022 — its `deprecatedPostCourseGoals` api function and `index.js` re-export go too); `redux.test.js` and `slice.test.js`, which covered only the deleted code. `eventTypes` moves from `thunks.js` to `Unit/constants.ts` beside `messageTypes`, the other iframe postMessage vocabulary.
- **Docs:** a new `course-home/progress-tab/README.md` documents `useExamsData()` for plugin authors with an `env.config.jsx` example, beside the hook rather than in any slot's README (the hook isn't slot-scoped, and an example in a slot README would read as part of that slot's contract).
- **`src/utils.ts`: `executeThunk` deleted.** A test-only helper whose last importer was the deleted `redux.test.js`; codecov flagged its two now-unexecuted lines as the project-coverage drop.
- **Tests:** `apiHooks.test.tsx` covers the fan-out (order, 404 hole, logged failure, empty list, idle until ids known); `hooks.test.jsx` covers id derivation, `null` before load, and refetch on a changed list, seeding the progress query instead of mocking Redux; `ProgressTab.test.jsx` replaces the six store-inspection tests with a real configured `DIRECT_PLUGIN` calling the hook in the course-grade slot (the file unmocks the plugin framework for that) plus a zero-requests-without-a-plugin case. Test-environment errors now carry explicit `customAttributes`, matching `api.test.js`, so the 404 hole exercises the api's real branch.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (108 suites, 1096 passed / 3 pre-existing skips). Manual pass on tutor local: see the details block below (results section to be filled in).

## Decisions
<details>
<summary>Full decision log</summary>

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

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — progress-tab exam attempts → React Query hook (#2075)

In-browser verification for the exam-attempts layer, run against a live
backend (tutor local). This layer claims **one user-visible change and one
contract change**: attempt requests no longer fire on the progress tab unless a
plugin asks for the data, and plugins read that data through `useExamsData()`
instead of `state.courseHome.examsData`. Nothing rendered by the app itself
changes. The acceptance test is the same `env.config.jsx` probe used to record
the Redux baseline (issue comment on #2075), with its one `useSelector` line
swapped for the hook.

## Setup (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; base
`http://apps.local.openedx.io:2000/learning`. Progress tab:
`/course/course-v1:OpenedX+DemoX+DemoCourse/progress`.

- DemoX has no proctored exams. Tutor local has no `EXAMS_BASE_URL`, so the
  requests go to the LMS `edx_proctoring` attempt endpoint, which answers each
  subsection with a 200 and `{"exam": {}, "active_attempt": {}}`, so every
  entry is `{}` (the api's 404 → `{}` mapping is the other route to the same
  value; a first draft attributed the 200 to edx-exams — the observed URL was
  the LMS one). To see content, apply the dev-only stub to `getExamsData`
  in `course-home/data/api.js` (kept as `exams-dev-stub.patch` in the session
  scratchpad and reproduced in the #2075 issue comment). **Never commit it.**
- Attempt requests show in the Network tab as GETs to
  `/api/edx_proctoring/v1/proctored_exam/attempt/course_id/...` (or
  `/api/v1/student/exam/attempt/...` with `EXAMS_BASE_URL`), one per
  subsection (17 on DemoX). **The stub returns before any request is made**,
  so request counts can only be checked with the stub OFF; with it on, the
  only exam-related GETs on the page are the special-exams library's own
  timer calls.

## Verify by hand

**A. No plugin (plain `env.config.jsx`, no progress-tab slot config; stub OFF):**

- [x] **Zero attempt requests** — load the progress tab: the Network tab shows
      no attempt GETs at all (baseline made 17); grades, certificate status,
      related links render as before; no console errors.

**B. Probe plugin on the Redux read (the baseline `env.config.jsx`):**

- [x] **Fails as expected** — the probe's `useSelector(state =>
      state.courseHome.examsData)` now reads `undefined`. The probe guards
      only `=== null` (the store's one pre-load value), so `.length` throws
      `TypeError: Cannot read properties of undefined (reading 'length')`.
      (Confirms the break is real and visible to a plugin author, not a
      silent no-op. A plugin guarding with `if (!examsData)` would render
      nothing instead.)

**C. Probe plugin on the hook (swap two lines):**

```jsx
import { useExamsData } from './src/course-home/progress-tab/hooks';
// ...
const examsData = useExamsData();
```

- [x] **Same six boxes, same array** — `course_completion`,
      `certificate_status_main_body`, `course_grade`, `grade_breakdown`,
      `certificate_status_side_panel`, `related_links` each show 17 entries;
      without the stub all `{}`, with the stub 17 stub exams in the same
      subsection order as the baseline capture.
- [x] **One fan-out for six readers** (stub OFF) — exactly 17 attempt GETs,
      not 6 × 17.
- [x] **`null` before load** — on a hard reload the boxes briefly show
      `null (not fetched yet)` before filling in (throttle the network if it
      is too fast to see).
- [x] **`pluginProps` unchanged** — each box still shows only `id` (plus
      `enableProgressGraph` on course completion); exam data is not in any
      slot's props.

## Left to the automated suite (not re-done by hand)

- Fan-out semantics — `apiHooks.test.tsx` (`useExamAttemptsData`): positional
  order, `{}` for a 404, `{}` + one `logError` for a 500 with the rest
  resolving, `[]` for no ids, idle until ids are known.
- Id derivation from `sectionScores`, `null` before the progress data, and
  re-fetch on a changed subsection list — `hooks.test.jsx` (`useExamsData`).
- A real configured `DIRECT_PLUGIN` reading the hook inside `ProgressTab`, and
  zero attempt requests with no plugin — `ProgressTab.test.jsx`
  (`exam attempt data for plugins`).
- The iframe `POST_EVENT` guard after `eventTypes` moved —
  `useIFrameBehavior.test.js`.

## Results

Env: tutor local, DemoX, local branch @ `cada4495` (no PR yet). Dev stub ON
for the box-content checks, OFF for the request counts (the stub returns
before any request is made).

- **C, same six boxes** — passed: identical to the baseline capture (17
  entries / 17 exams per box, same order, nested certificate slot absent,
  `pluginProps` unchanged). Recorded on the issue.
- **README example** — passed: the one-widget course-grade example renders the
  17 stub exams.
- **C, one fan-out for six readers** — passed, stub OFF: 19 exam-related GETs
  on the page = 17 attempt requests (one per subsection) + 2 special-exams
  timer calls; not 6 × 17. Each box read 17 entries / 0 exams (the LMS attempt endpoint
  answers 200 + empty `exam`, not 404 — corrected in the issue comments).
  With the stub ON there are no attempt GETs at all (the stub returns before
  the request); a first draft of the issue comment claimed 17 under the stub
  and was corrected.
- **A, zero requests with no plugin** — passed, stub OFF: with the slot
  config removed from `env.config.jsx`, only the 2 special-exams timer calls
  remain on the page; no attempt GETs.
- **B, old Redux probe fails** — passed (it fails): the dev server reports
  `TypeError: Cannot read properties of undefined (reading 'length')` from the
  probe's `examsData.length`, because the slice no longer has the field and
  the probe guarded only `=== null`. Contained per slot: behind the dev
  overlay the page renders the "Your progress" header and six copies of
  frontend-platform's error fallback ("An unexpected error occurred. Please
  click the button below to refresh the page."), one per probe slot — the
  plugin framework wraps each direct plugin in an `ErrorBoundary`
  (`PluginContainer.js`). My pre-run prediction ("boxes render 0 entries")
  was wrong: the probe never handled `undefined`.
- **C, `null` before load** — passed.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
