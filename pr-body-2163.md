## Summary

Learning's suite asserted nothing learner-facing about exams: `Course.test.jsx` replaces the exam wrapper with a div, `useExamAccess.test.jsx` replaces the library's hooks, no fixture sequence is time-limited, and the exam handler `mockCourseRequests` registered was on the wrong host with `content_id/undefined`, so it never matched, the library's request fell to the `[200, {}]` catch-all and `@edx/frontend-lib-special-exams` sat in a swallowed TypeError (`data.exam.total_time` on `{}`) on every sequence render. This layer is the regression net for swapping that library to its React Query major (openedx/frontend-lib-special-exams#175): HTTP-boundary tests that render learning's real trees with the real installed library (4.1.0) and assert what the learner sees per exam state, so that on the upgrade only the provider mount in the test wrapper changes. **No app code changes; no behaviour or request change.** Part of the Redux → React Query migration (#1946, Stage 1), layer 1 of the #2018 stack, on `master`. Closes #2163.

## What changed

- **`src/tests/mockSpecialExams.ts`** (decision 2): a stateful mock of the exam backend for both URL families the library talks to (LMS `edx_proctoring` without `EXAMS_BASE_URL`, edx-exams with it). GET exam / latest attempt return the current attempt, POST creates one (`started` / `created` / `declined` from the payload), PUT applies its `action`, the poll returns the status and a countdown, plus settings, review policy and access token with failure switches. It records every request. `mockSpecialExams.test.ts` pins its contract (11 cases).
- **`src/tests/specialExamsFactories.ts`** (decision 1): the library's four payload shapes ported as `specialExam*` Rosie factories; importing them from the package is blocked twice over, by its `exports` map and by learning's unanchored Jest `moduleNameMapper` entry.
- **`src/setupTest.js`:** `mockCourseRequests` registers the mock before its catch-all (axios-mock-adapter matches in registration order) and returns it as `specialExams`, answering "no exam" for every sequence until a test calls `specialExams.setExam(sequenceId, scenario)`; the broken handler goes. A JSDoc `@param` on `render` types its options so TypeScript tests can pass a store (decision 10).
- **`src/courseware/course/sequence/Sequence.specialExams.test.tsx`** (decisions 3–4): 79 tests, one `describe` per exam state with one observable per test. The timed flow (entrance, start, timer variants, End My Exam → continue → submit, no time left, past-due rules, time-out, an attempt from another sequence), every proctored state (setup page with both System Check targets and the premature Start Exam, legacy REST steps, ready to start with the review policy and Start exam, the 5 s LTI entry check with and without a proctoring app, ready to submit, submitted and second review, verified / rejected / errored per type with the practice retry, the four onboarding statuses, prerequisites, enrollment refusal, unknown status), the exam access token on the unit iframe, staff and masquerade, gating, the API error alert, and the per-sequence request count.
- **`src/tab-page/TabWithTimer.test.tsx`:** 7 tests for the outer timer on a course-home tab: with and without a running attempt, ending the exam from a tab, the failing latest-attempt request, and the legacy URL family.
- **Asserted as found** (decisions 5, 7, 8): `exam_access=` is always on the unit URL once access is unblocked, empty without a token; the library's `ExamTimerBlock` never removes its `TIMER_LIMIT_REACHED` listener, so each timer mounted earlier in the file dispatches another `expireExam` at the limit; the 500 alert's heading is the error's message verbatim.
- **Not covered** (decision 9): the unauthenticated learner; the shared `render` has no way to pass a null user.

## Testing

- `npm run types`, `npm run lint`, `npm test`: 123 suites, 1253 tests, all green; 97 of the tests are new, and no existing test changed behaviour once the library ran its success path.
- The manual baseline these tests are the automated form of (every attempt state on tutor local, with the dev mock that produced it) is on #2018: https://github.com/openedx/frontend-app-learning/issues/2018#issuecomment-6020008931. Each section-B row there has a named test here.

## Decisions

The decision log for this layer, verbatim:

<details>
<summary>Full decision log</summary>

# Decisions — cover the special-exams learner flows at the HTTP boundary (#2163)

Layer 1 of the #2018 stack on `master`; the regression net for swapping
`@edx/frontend-lib-special-exams` to its React Query major
(openedx/frontend-lib-special-exams#175). Entries 1–3 were settled in the
plan (`plan-2018-testing.md`, "Layer 1 plan"); the rest come from the
implementation (2026-10-07). No app code changes.

1. **The library's payload shapes are ported, not imported.** The library
   ships its Rosie factories in `dist/data/__factories__/`, but its
   `package.json` `exports` map exposes only `./dist/index.js`, so Node
   refuses the deep path (`ERR_PACKAGE_PATH_NOT_EXPORTED`) and so would any
   exports-aware resolver; and learning's Jest `moduleNameMapper` has an
   unanchored `@edx/frontend-lib-special-exams` entry that sends *any*
   specifier containing that string to the package root, so the import
   loaded `dist/index.js` and the factories silently never registered.
   `src/tests/specialExamsFactories.ts` carries the four shapes byte-for-byte
   from the library's `src/data/__factories__/` at 4.1.0, under
   `specialExam*` names so they cannot collide with learning's own factories.
   If v5 exports them, this file goes.

2. **One stateful mock, registered by `mockCourseRequests` before its
   catch-all and returned as `specialExams`.** `axios-mock-adapter` matches
   handlers in registration order (`findHandler` walks the array; `reply`
   pushes), and `logUnhandledRequests` registers an `onAny` catch-all last, so
   a handler a test added after `mockCourseRequests` returned would never be
   reached. `mockSpecialExams(axiosMock, courseId)` therefore registers both
   URL families once per course, keeps per-sequence state, and reads it at
   request time; a test sets a sequence's exam with
   `specialExams.setExam(sequenceId, scenario)` after the fact. The default is
   "no exam" for every sequence, which replaces the handler on `setupTest.js`
   line 220 that was on `LMS_BASE_URL` with the edx-exams path shape and
   `content_id/undefined`, never matched, and left the library in a swallowed
   TypeError (`data.exam.total_time` on the catch-all's `{}`) on every
   sequence render. Rejected: an `exams` option on `mockCourseRequests`; the
   exam state belongs next to the assertions that depend on it.

3. **Two test files, by owner page, each with its own request-count case.**
   `Sequence.specialExams.test.tsx` renders `<Sequence>` as `Sequence.test.jsx`
   does (course route, `SidebarProvider`, `MountCourseQueryHooks`, a store)
   for the exam states, the access token (the Unit is inside) and the
   per-sequence count; `TabWithTimer.test.tsx` renders `<TabWithTimer>` over a
   tab's metadata query for the outer timer and its count. Counts are single
   fetches: Jest renders without `StrictMode`, which doubled the mount-effect
   fetches in the manual run.

4. **A fresh store per render.** The library keeps the exam, the active
   attempt and `isLoading` in its Redux slice and only refetches on mount when
   the sequence is time-limited or nothing has loaded yet, so a shared store
   would carry one test's exam into the next. `renderSequence` builds
   `initializeStore()` per call. `Sequence.test.jsx` shares one store across
   its tests because none of them has an exam.

5. **The time-out test tolerates more than one `submit`, and says why.** The
   library's `ExamTimerBlock` registers `Emitter.once(TIMER_LIMIT_REACHED, ()
   => dispatch(expireExam()))` on the module-level `eventemitter3` singleton
   and cleans up with `Emitter.off(TIMER_LIMIT_REACHED, () =>
   dispatch(expireExam()))`, a new function, which removes nothing. Every
   timer mounted earlier in the file left a listener bound to its own store,
   and each dispatches `expireExam` when this test's clock hits the limit (five
   submits in the full file, one when run alone; verified by logging the
   request times). The assertion is "at least one action, every action a
   submit", with the cause named inline. In the app the same leak means one
   `expireExam`, hence one `submit` PUT, per timer mount in the session when
   time runs out; pre-existing, the library's to fix, recorded in
   `plan-2018.md` finding 11a, not filed.

6. **The entry-check reply is a synthetic `MessageEvent`.** `checkExamEntry`
   posts `proctorio_status` to `window.top` and accepts a reply only when
   `event.origin === getConfig().EXAMS_BASE_URL`. jsdom's `postMessage`
   (`lib/jsdom/living/post-message.js`) never sets `event.origin` (a TODO),
   so no real `postMessage` reply can pass that check, whatever the configured
   origin. The test's listener answers the probe with
   `window.dispatchEvent(new MessageEvent('message', { data: { active: true },
   origin: EXAMS_BASE_URL }))`. Rejected: pointing `EXAMS_BASE_URL` at
   `window.location.origin` and replying with `postMessage`, which fails for
   the same reason and, when the test then failed mid-flight under fake timers,
   left the library's error path running into the next test (every later test
   in the file timed out on a spinner until this was fixed).

7. **`exam_access=` is asserted as always present once access is unblocked.**
   `Unit/urls.ts` sets `exam_access` to the library's token whenever
   `blockAccess` is false, so with no `EXAMS_BASE_URL`, or after a failed token
   request, the unit URL carries `exam_access=` with an empty value. The tests
   assert that parameter equals `''` rather than its absence, because that is
   what the app does today and v5 changing it should be a visible choice.

8. **The 500 alert's heading is asserted as the thrown message.** `ExamAPIError`
   shows `apiErrorMsg` verbatim unless it contains `<`, and `handleAPIError`
   stores `error.message || detail`. The test auth service's client is a
   plain `axios.create()` with no frontend-platform interceptor, so the
   heading under test is `Request failed with status code 500`; in the browser
   it is frontend-platform's "Axios Error (Response): 500 - See custom
   attributes for details." (manual baseline, B14). Same mechanism, different
   text; the test names it.

9. **Not covered: the unauthenticated learner.** `ExamWrapper` and
   `OuterExamTimer` return early when `authenticatedUser` is falsy. The shared
   `render` takes no `authenticatedUser` option and always mounts
   `AppProvider` with the mock app's user; adding an option is a `setupTest.js`
   change beyond this layer. Left uncovered and noted rather than worked
   around.

10. **`render`'s options are typed with a JSDoc `@param`, not by converting
    `setupTest.js` to TypeScript (settled 2026-10-07).** TypeScript infers the
    options type of the JavaScript `render` from its destructuring defaults,
    so `store = null` makes the option's type `null` and the first `.test.tsx`
    to pass `initializeStore()` failed `npm run types`. The JSDoc gives the
    function a declared parameter type that TypeScript callers see without
    touching the implementation. Rejected: casting at the call sites, and a
    peel layer converting `setupTest.js` to `setupTest.tsx`. The conversion is
    modest (301 lines, eight exports, two `jest.config.js` path references,
    an options interface for `mockCourseRequests` as the one real design;
    the Rosie factories it imports stay implicitly `any`), but it is its own
    piece of work, it would touch a file every one of the 66 suites loads,
    and this layer gains nothing from it beyond the one option type. Left as
    a possible follow-up, not filed.

11. **`mockSpecialExams` and the ported factories are this layer's, not
    learning's long-term (settled 2026-10-07).** These are integration tests
    of learning plus the installed library against a stand-in backend, and
    the only stable place to stand across the v5 swap (which changes the
    library's internals and the app's wiring to it together) is below both,
    at HTTP. That means the mock has to know the backend contract the
    library speaks, knowledge that already lives in the library's own
    `data/redux.test.jsx` fixtures. The line is drawn by ownership: v5 ships
    a consumer-facing backend mock built from its own payload shapes (task
    added to openedx/frontend-lib-special-exams#175), the library owns "what
    the backend looks like" and its mock, learning owns "what the learner
    sees here" and consumes it. Layer 2 replaces `src/tests/mockSpecialExams.ts`
    and `src/tests/specialExamsFactories.ts` with the library's mock rather
    than maintaining them. Until then the mock has its own unit test, so a
    mock bug reads as a mock bug and not as library behaviour.


</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
