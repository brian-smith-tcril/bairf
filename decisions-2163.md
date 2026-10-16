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

