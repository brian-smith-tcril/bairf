# Console noise in master's test suite, and what the port does with it

Source: one `make validate` run of the legacy suite on 2026-10-21, tree at
`50faa452` (the branch point; identical to `master`) with the two root
ignore lines in place. 124 suites, 1279 tests, all passing; 2101 jest
console blocks (960 `console.warn`, 296 `console.error`, 845 `console.log`)
plus 172 react-router deprecation stack frames outside console blocks.
Attribution is to the first `src/*.test.*` frame in the printed stack; a
block whose stack reaches the test only through non-test frames is
"unattributed" and is counted by message.

Package baseline for comparison: `frontend-base/` at `f8a64c1e`, 2 tests,
2 console blocks, both the react-router future-flag warnings from
`Main.test.tsx`'s `BrowserRouter`.

## Inventory, largest first

| count | kind | message | emitter | fate under the port |
|---:|---|---|---|---|
| 679 | log | `get http://localhost:18000/...` (and patch, post) | legacy `src/setupTest.js:158`, a `console.log(config.method, config.url)` on every mocked request | gone by construction: the new setup file does not log requests (test conventions in #1905's plan; converted apps' setup files have no console hooks) |
| 566 | warn | `[Deprecated] ProductTour: The 'dismissButtonText' options within the 'tours' prop now expects a string` | Paragon, because `NewUserCourseHomeTour.jsx:87` passes a `<DismissButtonFormattedMessage />` element | app code; fixed in the tours port (#2208) by passing `formatMessage(...)`, a string |
| 178 | warn | `Module configuration error: <KEY> is required by config` (6 keys × 29, plus `EXAMS_BASE_URL` × 4) | frontend-platform `ensureConfig` | gone with frontend-platform |
| 138 | log | `Unexpected course block type: course with ID ...` | `courseHomeOutline.ts:224` and `courseNavigationOutline.ts:109` call `logInfo` for the root `course` block; the legacy setup's `logInfo` mock prints to `console.log` | half by construction (the new setup mocks the logger silently or asserts on it); the other half is a real app oddity, the normalizers warn about the course block they always receive, looked at in the outline tab and navigation sidebar ports (#2191, #2197) |
| 134 | error | `[react-bootstrap] Specifying only the "hover" trigger limits the visibility of the overlay to just mouse users` | Paragon `OverlayTrigger` with `trigger="hover"` in `GradeSummaryHeader.jsx:27` and `GradeSummaryTableFooter.jsx:44` | app code, an accessibility warning; fixed in the progress tab port (#2190) with `trigger={['hover', 'focus']}` |
| 74 | warn | `A function to advance timers was called but the timers APIs are not replaced with fake timers` | `Sequence.specialExams.test.tsx` (72), `index.test.tsx` (2) | test code; fixed in the exams port (#2198): `jest.useFakeTimers()` in the file or drop the advance calls |
| 66 | error | `Failed prop type: ...` (16 distinct props) | tests rendering components without required props (`NextButton`, `PreviousButton`, `SequenceContent`, `WeeklyGoalCelebrationModal`, `SubsectionTitleCell`, ...) | test code; fixed per file at port time by passing the props the component declares; disappears outright where a component converts to TypeScript and drops `propTypes` |
| 60 + 60 | warn | React Router future-flag warnings (`v7_startTransition`, `v7_relativeSplatPath`), once per suite that mounts a router | react-router 6.30 on every `BrowserRouter`/`MemoryRouter`/`createBrowserRouter` without `future` flags; 58 suites | see "React Router" below; frontend-base's shell has the same gap at runtime |
| 40 | error | `An update to <NotificationsTray|MasqueradeWidget|GoalUnsubscribe|Overlay> inside a test was not wrapped in act(...)` | 33 from `NotificationsTray` in `@edx/frontend-component-header`; 4 `MasqueradeWidget`, 2 `GoalUnsubscribe`, 1 `Overlay` | the header's go with the header package; the three app ones are test code, fixed at port with `await findBy*`/`waitFor` |
| 16 + 1 | log | `AxiosError: Request failed with status code 404` (400) | the legacy `logError` mock printing to `console.log` | gone by construction with the new setup |
| 15 | error | `Not implemented: navigation (except hash changes)` | jsdom, when code assigns `window.location` (6 sites in `src/`; `DatesTab`, `OutlineTab` tests hit them) | mostly gone: redirects become route loaders (#1905's plan); any remaining assignment gets a `window.location` stub in its test |
| 14 | warn | `No routes matched location "/redirect/..."`, `"/course/.../home"` | tests mounting a `MemoryRouter` at a path with no matching route (redirect tests, `CourseAccessErrorPage`) | test code; the redirect tests are rewritten with the loaders (#2205); route tests render through the exported route array |
| 8 | warn | `PubSub already loaded, using existing version` | `pubsub-js` loaded twice in one jsdom (frontend-platform's copy and another) | gone with frontend-platform; frontend-base bundles its own event bus |
| 8 | error | `Not implemented: window.focus` | jsdom; `ContentIFrame.test.jsx` | test code; stub `window.focus` in that file at port (#2196) |
| 5 | error | `findDOMNode is deprecated` | react-bootstrap inside Paragon (`OutlineTab`, `SidebarSequence`, `Calculator` tests) | upstream (Paragon); not ours to fix; see policy |
| 4 | error | `A props object containing a "key" prop is being spread into JSX` | `MasqueradeWidgetOption.test.tsx` and two unattributed | app or test code; fixed at port (#2194) |
| 3 | error | `forwardRef render functions do not support propTypes or defaultProps` | `ProgressTab`, two `index` tests | app code (a `forwardRef` component with `propTypes`); fixed at port |
| 3 | error | `Unable to get masquerade options AxiosError` | masquerade widget tests exercising the error path through the real `logError` | expected output of an error-path test; assert on the logger instead of letting it print (#2194) |
| 3 | error | `React does not recognize the <timeIsOver|data-testId|courseId> prop on a DOM element` | props spread onto DOM elements | app or test code; fixed at port |
| 3 | log | `Page failed to load, probably an invalid URL.` | `logError` mock | gone by construction |
| 2 + 1 | error | `<Suspense /> is using incorrect casing` / `The tag <Suspense> is unrecognized` | `UnitSuspense.test.jsx` mocks `React.Suspense` as a string | test code; fixed at port (#2196) |
| 2 + 2 + 1 | error | `Uncaught [Error: useSidebar must be used within a SidebarProvider]`, `The above error occurred in <TestComponent>` | `SidebarContext.test.jsx` asserting that the hook throws | expected: an error-boundary test prints React's report; silence `console.error` inside that one test |
| 2 + 2 + 2 | error/log | `Cannot read properties of undefined (reading 'sendPageEvent')`, `The above error occurred in the <PageWrap> component` | `CoursewareRedirectLandingPage.test.jsx` with an unmocked analytics service | test code; gone with the loader rewrite (#2205) |
| 2 | error | `Could not find icon null` | Paragon `Icon` given `null` | app or test code; fixed at port |
| 2 | log | `Exam access token was not granted.` | `logInfo` mock | gone by construction |
| 1 each | error | `validateDOMNesting: <div> cannot appear as a descendant of <p>`; `Cannot update a component (GradeSummary) while rendering GradeSummaryTable`; `JumpNavMenuItem: Support for defaultProps will be removed` | app code | fixed at port (#2190, #2196) |
| 1 each | log | `the insert operation config is invalid for widget id: exams_data_plugin`; `LoadedTabPage rendered without course metadata`; `Section "Introduction" rendered without outline data`; `Section section has child block missing` | `logError`/`logInfo` mocks on expected error paths | gone by construction; the tests assert on the logger where the message is the point |

## Three classes

1. **Gone by construction** (about 1,050 blocks, half the total): the legacy
   setup file's request logger and its `logInfo`/`logError` mocks that print
   to `console.log`, frontend-platform's `ensureConfig` and `pubsub-js`
   double load, the header package's `NotificationsTray`. The new package's
   setup has none of these, so a port that copies a legacy test keeps the
   assertions and loses this output without doing anything.
2. **Real findings in app code** (about 700): the ProductTour deprecation,
   the hover-only overlays, the `course`-block log in both normalizers, the
   `forwardRef`/`propTypes` and DOM-prop leaks. Each is fixed in the port
   that carries the file, as the faithful port of a component that is
   correct, not of its warning. Decision 8 already requires a behavior the
   manual pass finds untested to get a test; the same PR shape covers these.
3. **Test code and environment** (about 250): missing props, un-awaited
   updates, fake timers, jsdom navigation and focus, mocked `Suspense`,
   routers mounted off-route, error-boundary tests printing React's report.
   Fixed per file at port time.

And one that is neither: the two React Router future-flag warnings, which
are the only noise the package has today and would be the only noise left
after the three classes above.

## React Router

The warnings come from react-router 6.30 whenever a router is created
without `future: { v7_startTransition, v7_relativeSplatPath }`. Learning's
runtime on frontend-base does not create the router; the shell does
(`createBrowserRouter` in frontend-base `shell/router/createRouter.tsx`,
no `future` key), so the warning also appears in the browser console of
every frontend-base site in development, which Brian saw on 2026-10-21.
No frontend-base issue or PR mentions the flags (searched 2026-10-22).

Options for the package's tests, where `Main.test.tsx` and every later
route test mount a `MemoryRouter` or `createMemoryRouter`:

- A. The shared render helper (decision 23 keeps one) creates its router
  with the same `future` flags the shell will use. Honest only once the
  shell sets them; until then tests would run under v7 semantics the
  runtime does not have. Pairs with a frontend-base PR adding the flags
  to `createRouter.tsx`, which is small and self-contained.
- B. The setup file filters exactly these two messages from
  `console.warn`, with a comment naming the frontend-base issue. Removes
  the noise today, hides nothing else, and is deleted when the shell
  change lands.
- C. Leave them. Two lines per suite, 58 suites on master's scale.

## Keeping the package clean once it is clean

The converted apps do not enforce console cleanliness (no
`jest-fail-on-console` in account, catalog, profile or instructor
dashboard; their setup files have no console hooks). Two ways to hold the
line in Learning's package so a port cannot reintroduce classes 2 and 3:

- A setup-file hook that fails a test on any `console.error` or
  `console.warn` it did not expect: `jest-fail-on-console` as a dev
  dependency (allowlist by message for the two router warnings under
  option B above), or ten lines of our own in `setupTest.js`. A test that
  exercises an error path mutes the console for that test explicitly,
  which also documents that the output is the point.
- Review only: the port PR's testing section states "no console output"
  and the reviewer reads the CI log. Cheaper, and it is how master got to
  2,101 blocks.
