## Summary

Every courseware URL form now resolves in Learning's frontend-base package to the course, sequence and unit it resolves to on `master`. The courseware container and its redirect rules port, and the three courseware routes and two preview routes load them in place of the stub page. The course component itself is a stub until #2196: the page reads "course: not yet ported" and prints the three resolved ids. **No user-facing change on `master`**: the legacy tree under `src/` is untouched.

Part of #1905. Resolves #2195. Stacked above #2261.

> [!NOTE]
> **For reviewers:** the ported files are added under `frontend-base/src/` as new files, so this diff cannot show what changed from `master`. The `port-diff` script in #2234's description prints that diff, from `frontend-base/manifest.tsv`. `courseware/index.js` is identical to `master`'s, and `CoursewareContainer.tsx` differs in its position effect alone. `CoursewareContainer.test.jsx` is the file to read through that script: its cases are `master`'s, and what differs is listed under Testing.

## What changed

- **The container and its redirects.** `CoursewareContainer.tsx`, `CoursewareRedirects.tsx` and `courseware/index.js` move to the same paths under `frontend-base/src/`. The five routes share one lazy loader and the `learning-courseware` chunk; their ids and roles are unchanged.
- **The position effect limits itself with a ref.** `master`'s effect lists the route's unit as its only dependency, so that the sequence loading after the unit opens does not save; the package's lint reports that line. Here the effect lists every value it reads and returns early unless the route's unit differs from the one it last handled, kept in a ref, as `master`'s `sidebar/hooks/useUnitShiftBehavior.ts` detects a unit change. It saves in the same cases: not when the sequence loads later, once for each move to another unit, and on mounting at a unit whose sequence is already loaded.
- **Redirect destinations resolve Learning's roles.** `master`'s rules build paths at the root of its own site; under the shell Learning's routes sit below `/learning`. `coursewarePath` returns the courseware role's URL for a course, `getSequenceUrl` for a sequence, the new `getUnitUrl` for a unit, and for a preview the learning role's URL followed by `/preview/course/` and the ids. The outline-failure rule returns the course outline role's URL whatever the course's tab list holds, as `master` redirects there unconditionally.
- **`courseware/urls.ts`** has one guard, which throws when no route provides a role, behind `getCourseOutlineUrl`, `getCoursewareUrl`, `getSequenceUrl` and `getUnitUrl`.
- **Two stubs at `master`'s import paths.** `courseware/course/index.tsx` prints the three ids inside a `<main>` (#2196); `courseware/course/celebration/index.ts` exports a `handleNextSectionCelebration` that does nothing (#2201).
- **`shouldRetryQuery` takes an `Error`** where `master`'s takes `unknown`. A query that spreads `queryDefaults` takes its error type from the policy's parameter, so every query in the package was typed as failing with `unknown`, and the container is the first TypeScript file to hand a query to `TabPage`, whose props expect the library's default, `Error`. On `master` the policy is a client default and no query infers from it.
- **`tests/render.tsx` gains `renderBrowserRoutes`** beside the memory-router `renderRoutes`, for the container suite.
- **`buildBinaryCourseBlocks`** comes with the suite; `courseBlocks.factory.js` has every builder `master`'s has. No commented line naming #2195 remains in the package.
- **Manifest.** Four lines for the ported files.

## Known differences from `master`

- **On a courseware page the shell's course bar selects no tab**, where `master` selects the Course tab. The course bar selects the tab whose URL is the longest prefix of the address, and a unit's address is under none of the tabs' (openedx/frontend-base#359). Nothing in this layer sets it.
- **The page is the stub** until #2196.

## Testing

In `frontend-base/`: lint, the tests, `build` and `build:ci` pass. 49 suites, 846 tests passed and 17 skipped (the six this layer skips, below, and eleven from earlier layers). Lint ran with the package's `.jsx` files included (openedx/frontend-base#327).

**`CoursewareContainer.test.jsx` is held to `master`'s cases**: the harness around them adapts, a case that cannot run is parked whole, and no expected value changes.

- It renders the route array under a browser router, as `master`'s suite renders under `BrowserRouter`, so the cases keep `history.push(…)`, `global.location.href` and the `history.replaceState` spy. The addresses they expect gain `/learning` and nothing else.
- `master` mocks the unit, one component below the course component, as a fake unit. With the course component a stub, the suite mocks the same fake unit one level up, at `./course`, so the cases that read it keep `master`'s assertions; #2196 moves the mock back down.
- `loadContainer` waits for the spinner to appear and then to go, since the routes load lazily.
- The header assertions go, the header being the shell's. In their place the cases assert that the two metadata requests and the outline request succeeded, which is what the header stood for; #2196 can assert on the page title instead, and the helper carries that issue's URL.
- Six cases need the real course component and are `it.skip` under #2196's URL with their bodies unchanged: the first-section celebration record, the sequence navigation slot, the completion check on Next, the position save on Next, the disabled Next control and the page title. The sequence navigation assertions are commented out under the same URL.
- The suite turns the retry policy off, as `master`'s test client does for every query, and answers the outline tab's request, since a redirect to the course home renders that tab.

**New cases**, after `master`'s in the same file: two for the position save, clicking links placed around the routes (nothing saved on opening a unit and one save for each move; a save on coming back to a unit whose sequence is still in the cache); and seven for the forms that take more than one redirect, each asserting every address the router passes through, in order.

**New files.** `CoursewareContainerHandlers.test.tsx` calls the three handlers the container passes down, which the stub never calls, with the course component mocked as three buttons. `course/index.test.tsx` renders the stub: the ids it prints, and the page rules. `urls.test.ts` matches each of the four URL forms against the route array and tests the guard.

**Coverage.** The package is at 100% of lines at this layer, against its 96.15% bar. Counted as codecov counts a patch, against #2261's head, the layer adds 154 lines with none missed and none partly covered.

**Manual testing** on the package's dev site against tutor dev, with one enrolled learner in the demo course: the course root, a sequence alone, a unit alone and an id that is nothing, each as a URL, settle on a unit with the stub's ids matching the address; a preview address loses `/preview` for the learner; the course bar's tabs switch pages from a unit; the outline tab's and the progress tab's sequence links land on a resolved unit; the console. The rows of #2195's redirect table that need a section's id, a staff user or a failed request are left to the suite. The record is below.

## Decisions

What was decided while building this layer; the scope, the redirect table and the test plan are in #2195.

<details>
<summary>Full decision log</summary>

# Decisions: the courseware container and redirects (#2262)

Decisions made while building this layer of #2195. The scope, the
redirect table and the test plan are in #2195's plan and are not
repeated.

1. **The top layer of three, one commit.** The courseware data module
   (#2260) and the two route wrappers (#2261) are the layers below.

2. **`CoursewareContainer.tsx` is `master`'s file apart from its
   position effect, which limits itself with a ref.** The imports are
   relative paths that exist in the package, and the file reads
   nothing from the platform.
   - `master`'s effect lists `[routeUnitId]` as its dependencies, with
     the comment "only when the route's unit changes; the sequence
     loading later must not save" (#2146). `master`'s lint has
     `react-hooks/exhaustive-deps` off; the package's reports the line
     as a warning. Listing the six values it reads would save the
     position when the sequence loads, the thing the comment rules
     out.
   - Here the effect lists every value it reads and returns early when
     the route's unit is the one it last handled, kept in
     `handledUnitId`, a ref that starts empty so that mounting at a
     unit counts as a change. `master`'s comment sits on the guard.
   - What was weighed. React's documentation says not to suppress the
     rule: "We recommend treating the dependency lint error as a
     compilation error"
     ([Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies#why-is-suppressing-the-dependency-linter-so-dangerous)).
     For an effect that reacts to one value and reads others it gives
     an Effect Event
     ([the same page](https://react.dev/learn/removing-effect-dependencies#do-you-want-to-read-a-value-without-reacting-to-its-changes));
     the package's React, 18.3.1, has no `useEffectEvent`. A ref guard
     is not in those pages. It is in this codebase: `master`'s
     `sidebar/hooks/useUnitShiftBehavior.ts` compares
     `previousUnitIdRef.current` with the unit id in an effect, the
     ref created in `sidebar/SidebarContext.tsx` as `null` ("Start
     null so first render triggers unit shift logic"). Leaving
     `master`'s line with its warning, for a file identical to
     `master`'s, was the other candidate; the outline tab's
     `start_course` effect was made to list what it reads in its own
     port (#2252), and this one follows it.
   - Held by the two cases under "the position save" (entry 8).
   - One difference, in development only: under React's strict mode an
     effect runs twice on mount, and `master`'s would save twice at a
     unit whose sequence is cached where this one saves once.

3. **`coursewarePath` returns role URLs, in three branches.** No
   sequence id: the courseware role's URL for the course, on a preview
   too, since the course root has no preview route. A preview: the
   learning role's URL, `/preview/course/`, and the ids. Otherwise
   `getUnitUrl` with a unit id and `getSequenceUrl` without.
   - `master` joins whichever ids it is given, so a unit id without a
     sequence id would land in the sequence slot. No rule calls it that
     way (each passes a unit id only beside a sequence id), and here
     such a call returns the course's URL.
   - The outline failure rule returns `getCourseOutlineUrl(courseId)`,
     the course outline role's URL with no look at the course's tab
     list, since `master` redirects to `home` unconditionally.
   - The preview rule for a user who is not staff is unchanged:
     `pathname.replace('/preview', '')` removes the same segment from
     `/learning/preview/course/…`.
   - Two comments named `DECODE_ROUTES.COURSEWARE`, which the package
     does not have; they name `routes.tsx`.

4. **`courseware/urls.ts` has one guard and four forms.** `getRoleUrl`
   resolves a role for a course and throws `No route provides the role
   <role>` when none does, the guard `getSequenceUrl` already had.
   `getCourseOutlineUrl`, `getCoursewareUrl`, `getSequenceUrl` and
   `getUnitUrl` are built on it; `getSequenceUrl` is now the courseware
   URL and the sequence id, and returns what it returned before. The
   outline form is here because the redirect is its caller and needs a
   URL without the tab-list gate of `useCourseOutlineUrl`; a `?.url ??
   null` at the call would be a branch no test can take.

5. **Two stubs at `master`'s import paths.**
   - `courseware/course/index.tsx` (#2196): a `<main>` holding "course:
     not yet ported" and the three ids as `courseId=…`, `sequenceId=…`,
     `unitId=…`, an absent id printing `undefined`. The tab page gives
     the courseware tab no `<main>` of its own, since the real
     component brings one.
   - `courseware/course/celebration/index.ts` (#2201):
     `handleNextSectionCelebration`, typed with the two arguments the
     container passes and doing nothing.

6. **The five routes share one lazy loader.** `lazyCourseware` loads
   `./courseware` in the `learning-courseware` chunk, as
   `lazyProgressTab` serves the progress tab's two routes. Ids and
   roles are unchanged; the preview index keeps its 404 loader.
   `routes.test.tsx` loses the five courseware stub cases and their
   five page-rule rows; the stub's own test asserts the page rules on a
   unit.

7. **`shouldRetryQuery` takes an `Error`.** `master` declares it
   `(failureCount: number, error: unknown)`. A query that spreads
   `queryDefaults` infers its error type from that parameter, so every
   query in the package was typed as failing with `unknown`.
   `TabPage`'s `courseStatus` props are `UseQueryResult`, whose error
   type is the default `Error`. The three tab pages are `.jsx`, so
   nothing checked the mismatch until the container, a `.tsx` file,
   passed its queries to `TabPage` (`TS2322` in `build`). On `master`
   the policy is a client default and no query infers from it.
   - The parameter is `Error`, and the `httpError` helper in
     `queryClient.test.ts` returns `Object.assign(new Error(…), {
     response: { status } })`, an `Error` carrying the response as an
     axios failure does. No assertion changes, and `queryDefaults` is
     as the layers below have it.
   - Weighed and not taken, each leaving the function as `master` has
     it: spreading the policy through a constant typed with `Error`,
     which put the real type one step away from the function it
     describes; and typing `queryDefaults` as `Pick<UseQueryOptions,
     'retry' | 'refetchOnWindowFocus'>`, which fixes the error type
     and breaks inference of the data type in every query.
   - Prior art, read 2026-11-18: openedx/frontend-app-gradebook's
     `retryUnlessClientError` also takes `unknown` and sits in a
     spread options object
     ([`src/data/query.ts`](https://github.com/openedx/frontend-app-gradebook/blob/b98b972a9785ab9c634c59d87d874c1057174915/src/data/query.ts));
     its `useGradebookQuery` wrapper names the generics, with the
     error defaulting to `DefaultError`, so nothing is inferred from
     the policy.

8. **The container suite is held to `master`'s cases.** The rule,
   arrived at over three rounds of review: the cases stay `master`'s,
   the harness around them adapts, and a case that cannot run is
   parked whole, not rewritten. No expected value differs.
   - **A browser router.** `tests/render.tsx` gains
     `renderBrowserRoutes(routes)`, a `createBrowserRouter` over
     jsdom's address, beside the memory-router `renderRoutes` the
     package's other suites use. `master`'s suite renders under
     `BrowserRouter` and asserts on `global.location.href` and
     `history.replaceState`; a memory router has neither. With it the
     33 addresses the cases expect differ from `master`'s by
     `/learning` alone; "should stay on the sequence without a
     redirect to it" is `master`'s, spy and all; and the
     `audit_expired` case expects `uhoh%20oh%20no` as `master` does,
     which a memory router would hold unencoded. `afterEach` disposes
     of the router.
   - **The cases still push a path and then call `loadContainer()`.**
     `master` pushes onto frontend-platform's `history`, which its
     `BrowserRouter` reads. Here `history` is a small object in the
     suite whose `push` is `window.history.pushState` under
     `/learning`, which the browser router reads when it is created.
     Passing the path to `loadContainer` instead changed that call in
     every case.
   - **`loadContainer` waits for the spinner to appear, then for none
     to be on the page.** `master`'s one line,
     `waitForElementToBeRemoved(screen.getByRole('status'))`, cannot
     be kept: the routes load lazily, so the spinner is not there when
     the render returns, and when it is awaited first it is already
     gone by the time the test resumes; the helper then holds a
     detached node whose topmost ancestor still contains it, and times
     out.
   - **`master`'s fake unit, mocked one level up.** `master` mocks
     `./course/sequence/Unit` as `div.fake-unit` under the real course
     and sequence components. Here the suite mocks `./course` with the
     same element, shown when the route has a unit, as the sequence
     shows a unit. Every `.fake-unit` line is `master`'s, the two that
     assert it absent at the course root included, and the assertions
     `master` makes straight after the load stay as they are: the fake
     unit is on the page only once a redirect has reached a unit.
     #2196 moves the mock back to `./course/sequence/Unit`. The mock
     declares prop types for the two ids it reads, so it needs no
     `eslint-disable`. Asserting on the stub's `<main>` in place of
     the fake unit was the first version; it changed most cases in
     ways that came from the stub and not from the port.
   - The stub itself is rendered by `course/index.test.tsx`, through
     the routes with the requests mocked: the three ids it prints, and
     no page-rule diagnostics. Both go with the stub in #2196.
   - **Retries are off, as in `master`'s suite.** `master`'s test
     client sets `retry: false` for every query. Here each query
     carries the policy in its own options, which a client cannot
     override, so the suite mocks `@src/queryClient` with
     `queryDefaults.retry` false, and the two counts of a failing
     lookup read `toHaveLength(1)` as on `master`.
   - **"Saves the position on each unit change" is parked whole**, as
     `it.skip` under #2196's URL, its body `master`'s line for line:
     it clicks the real navigation's Next, which the stub does not
     have. Driving the same case with `router.navigate` would have
     kept its name and changed what it tests. The effect is this
     layer's, so two new cases under "the position save" cover it,
     clicking links placed in a layout route around the route array
     (the idiom of `master`'s "later visit to the course root" case):
     nothing saved on opening a unit, then one save for each move;
     and a save on coming back to a unit whose sequence is still
     cached. Against `master`'s effect both pass; against a ref that
     starts at the route's unit the second fails; with no guard both
     fail.
   - "Should ask for the resume block again on a later visit" puts its
     link in a layout route around the route array.
   - **The nine "when receiving a course_access error_code" cases
     stay.** #2189 had this issue drop them, since
     `shared/access.test.ts` covers each code's destination and
     `TabPage.test.jsx` the redirect. They run here as `master` has
     them, and a test file's diff against `master`'s is kept as small
     as it can be.
   - **The suite answers the outline tab's request**
     (`/api/course_home/outline/…`) in its `beforeEach`. Two of the
     access cases redirect a denied learner to the course home, which
     renders the real outline tab; with its request unanswered the tab
     threw (entry 16), and the package's suite fails on a console
     error, which it did in two runs of five.
   - **The two blocks this layer adds are the last two in the file**
     ("the position save", "the addresses a redirect passes through"),
     after `master`'s "request count", so `master`'s blocks keep their
     order and a diff pairs each with itself.
   - What still differs from `master` inside its cases, the config
     reads and `/learning` aside: the render calls; the header helper
     and its seven calls; the parked navigation helper and its six
     calls; six `it.skip` lines; the link case's layout route; three
     statements the package's lint splits over lines. Against
     `master`'s file the port adds 345 lines and removes 144; 167 of
     the added lines are the two blocks at the end.

9. **Left out or parked.**
   - `assertLoadedHeader`: the header is the shell's, and nothing in
     the package renders `.learning-header` (`HeaderSlot` is `dropped`
     since #2234; the org and title line is #2193's widget, which this
     suite never renders). On `master` the helper proves that the
     course metadata and the course blocks loaded.
     `assertMetadataAndOutlineLoaded` stands where it was called,
     seven times: it waits for the course-home metadata, courseware
     metadata and outline queries to read `success`, the idiom
     `waitForMetadataWithOutlinePending` already uses in this suite.
     "Blocks" in `master`'s comment is the learning-sequences outline,
     which the suite builds from its course blocks. It is a stand-in:
     with the course component stubbed, nothing on the page depends on
     the outline. `master`'s `Course.jsx` sets the page title to the
     sequence's, section's and course's titles from the outline once
     the outline query succeeds, so after #2196 the check can read
     `document.title`. The helper carries a one-line comment with
     #2196's URL so that port replaces it. The org and number return
     only in #2193's widget.
   - `assertNoSequenceNavigation` and its six calls are commented out
     under #2196's URL: it queries the real course component's
     navigation, and against the stub its first lookup finds no element
     to assert on.
   - Six cases are `it.skip` under #2196's URL: the first-section
     celebration record, the sequence navigation slot, the completion
     check on Next, the position save on Next, the disabled Next
     control, and the page title.
   - `master`'s mock of `./course/sequence/Unit` stays, as a virtual
     mock (`{ virtual: true }`, under #2196's URL): the module is not
     in the package yet, and the skipped cases still read
     `mockRenderUnitNav`. The mocked component gains a name, which the
     package's lint requires.

10. **Each hop of a multi-hop redirect has a case.** The suite's
    render records every pathname the router is at, from
    `router.subscribe`. Seven cases assert the whole list: the course
    root with no resume position; a section; a section and a unit; a
    unit no sequence holds; an id that is none of the three; a preview
    sequence for a user who is not staff; a preview section for staff.
    The ones that fall back to the course root go on to the resume
    position, so the list shows the root as a hop.

11. **`CoursewareContainerHandlers.test.tsx` calls the three
    handlers.** It mocks `./course` as three buttons and
    `./course/celebration` as a spy, in a file of its own beside the
    suite, as `ProgressTabComponents.test.tsx` (#2247) and
    `OutlineTabComponents.test.tsx` (#2252) are beside theirs. Six
    cases: the completion request with the unit's key; the celebration
    recorded when the next sequence is in another section and the
    first section is celebrated; nothing recorded with the next
    sequence in the same section, with the flag off, and on the
    course's last sequence; nothing requested by the previous handler.
    The factory's output is cast to the shape the cases read, since
    the factory is JavaScript and TypeScript reads the trees it fills
    in as empty (`build:ci` type-checks the tests).

12. **`urls.test.ts`** matches each of the four forms against the
    route array and tests the guard for both roles.

13. **Factories.** `buildBinaryCourseBlocks` comes with the suite. No
    commented line naming #2195 remains in the package.

14. **On a courseware page the shell's course bar selects no tab,
    where `master` selects the Course tab (manual pass, 2026-11-18).**
    On `master` the container renders the tab page with
    `activeTabSlug="courseware"`, the Course tab's id in the
    `course_metadata` response. The shell's course bar takes no slug
    from the page: it selects the tab whose URL is the longest prefix
    of the address (`findActiveTab`), the Course tab's URL ends in
    `/home`, and a unit's address is under none of the tabs'. It is
    the shell's rule and nothing this layer sets, so it is filed as
    openedx/frontend-base#359 and does not hold this layer.

15. **Seen twice, not this layer's: an intermittent failure in the
    outline tab's suite.** Two full runs of the package's tests
    (2026-11-17 and 2026-11-18), out of about twenty over the two
    days, failed `OutlineTab.test.jsx` "Certificate Available Alert ›
    appears" (`queryByText('Your grade and certificate status will be
    available soon.')` found nothing). The case is `master`'s,
    unchanged, in #2252's layer. It passed on the next full run both
    times, and never failed when its suite ran alone. Not diagnosed:
    the case asserts with `queryByText` straight after
    `fetchAndRender`, which waits for the heading and for the spinner
    to go, so an alert added a tick later would be missed under load.

16. **Seen while keeping the access cases, the same on `master` by
    reading, not this layer's: the outline tab throws for a denied
    learner whose outline request fails.** `TabPage`'s `deriveView`
    returns `isDenied` before it looks for a failed tab-data query,
    and the outline tab shows its page to a denied learner, so
    `OutlineTab` renders with no outline data and its nested
    destructure of `courseBlocks` throws. `master`'s line has `?? {}`
    after `.data`, which only moves the throw to `courseBlocks`; the
    port's line has none. `master`'s container suite renders only
    the courseware routes, so the outline tab never renders at that
    address there. Filed as #2263.

17. **Checks (2026-11-18).** `npm run lint` clean, with no warning,
    with the package's `.jsx` files included
    (openedx/frontend-base#327); `npm test`, 49 suites, 846 passed, 17
    skipped (the six of entry 9 and eleven from earlier layers); 100%
    of lines for the package. `npm run build` and `npm run build:ci`
    pass. Counted as codecov counts a patch, against #2261's head: 154
    added lines, none missed and none partly covered.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — the courseware container and redirects (#2195)

One section per layer of the stack. A layer's section asks only for what that layer changes
and a test cannot see, and says what each step needs beyond the page itself.

Drafted 2026-11-18 before the pass. The boxes are Brian's ticks; what was and was not
observed goes under each section's Record.

## Setup, for both sections

The same as for the outline tab; nothing new.

- The package's dev site: `cd frontend-base && nvm use && npm ci && npm run dev`, served at
  `http://apps.local.openedx.io:2000/learning/`, with tutor dev's `mfe` service stopped so
  the port is free.
- Tutor dev with `LEARNING_MICROFRONTEND_URL` pointing at
  `apps.local.openedx.io:2000/learning`, as for #2189.
- One user: a learner enrolled in the demo course, `course-v1:OpenedX+DemoX+DemoCourse`.

## The courseware data module

Nothing to do. No route renders this layer's code until the container layer.

## The route wrappers

On `bsmith/courseware-route-wrappers`.

What needs eyes: a real browser's address bar going through the two redirects and the page
rendering after them, the shell's course bar with the two new layout routes in the tree,
and a real browser's console. The suite runs the wrappers in jsdom.

- [x] **1. An encoded course key** — paste
      `http://apps.local.openedx.io:2000/learning/course/course-v1%3AOpenedX%2BDemoX%2BDemoCourse/home`
      into the address bar. The address becomes
      `…/learning/course/course-v1:OpenedX+DemoX+DemoCourse/home` and the outline tab
      renders.
      *Why here:* `DecodePageRoute` is back, as the layout route of the course routes. It
      now decodes every segment of the path.
- [x] **2. A space in the course key** — paste
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX DemoX DemoCourse/dates`.
      The address becomes `…/course/course-v1:OpenedX+DemoX+DemoCourse/dates` and the dates
      tab renders.
      *Why here:* `PathFixesProvider` is back, as a layout route around all of Learning's
      routes.
- [x] **3. The course bar** — from that page, click the Course, Progress and Dates tabs in
      turn. Each opens with no page load (the Network tab shows no document request), and
      the course bar stays in place.
      *Why here:* the route tree gained a pathless route and the two course routes render
      a wrapper where they rendered a bare outlet; the shell reads the course from the
      matched routes, which no test of Learning's renders.
- [x] **4. The console** — DevTools, Console, reload on any of the three tabs. No errors or
      warnings from Learning's code.

### Record

**2026-11-18, Brian, on the dev site, on `bsmith/courseware-route-wrappers` (`e0cef2b8`).**

- Brian ticked steps 1, 2, 3 and 4, with no notes on any of them.
- Two details those steps ask about were not noted and stay unrecorded: whether the
  Network tab was watched for a document request on each tab click (step 3), and
  whether the console held warnings that are not Learning's (step 4).

### Checked without you

- **The wrappers under a browser router**, 2026-11-18, in a throwaway case run and deleted:
  jsdom's browser router, which encodes an address as a browser does, started at an encoded
  course key, at a key with spaces, and at `c%6Furse`. Each settled on the clean address and
  rendered the page. Steps 1 and 2 are the same thing in a real browser.
- **A course key with a non-ASCII letter does not render, here or on `master`.** In the same
  throwaway case, started at `…/course-v1:Org+Caf%C3%A9+Run/home`, nothing rendered: the
  browser holds the address encoded, the wrapper decodes it to `é`, the two never match, and
  the wrapper keeps redirecting. `master`'s wrapper under `BrowserRouter` in jsdom did the
  same, so this layer does not introduce it. Not seen in a real browser.
- **Lint, tests and both builds** at the layer's head, on its own commit: all pass.

### Left to the suite

| State | Test |
|---|---|
| Every spelling of the course key on every course route (134 rows) | `decodeRoutes.test.tsx` |
| An escaped character in `learning`, `course`, `preview` or `home` | `decode-page-route/index.test.jsx`, "should decode an escaped character in the fixed segment" |
| A trailing slash left as typed | `index.test.jsx`, "should leave a trailing slash as it is" |
| A preview address decoded | `index.test.jsx`, "should decode a preview url" |
| A route outside the course routes: fixed for a space, not decoded | `PathFixesProvider.test.jsx`, `index.test.jsx` |
| One page event for each pathname of a course route | `index.test.jsx`, "should send one page event for each pathname of a course route". Seeing it by hand needs an analytics key on the site. |

## The container and redirects

On `bsmith/courseware-container`.

What needs eyes: the redirect rules against the real responses (the resume position, the
sequence, the error a unit id draws from the sequence endpoint, the outline), the course bar
on a courseware page, the earlier tabs' links reaching a unit, and a real browser's console.
The suite answers every request itself.

The page is a stub until #2196: it reads "course: not yet ported" and lists `courseId=…`,
`sequenceId=…` and `unitId=…`. "The stub matches" below means those three equal the ids in
the address.

- [x] **1. The course root** — open
      `http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse`.
      The address settles on `…/course/<course>/<sequence>/<unit>` and the stub matches.
      *Why here:* the container and its redirects replace the stub page on the courseware
      routes; this is the resume lookup and the outline for real.
- [x] **2. A sequence alone** — delete the last segment of that address, the unit, and press
      Enter. The address goes back to a unit of that sequence and the stub matches.
- [x] **3. A unit alone** — from the address in step 1, delete the sequence segment so the
      unit follows the course key, and press Enter. The address settles on
      `…/<sequence>/<unit>` again and the stub matches.
      *Why here:* the sequence endpoint's real answer to a unit id, and the lookup of the
      unit's parent, both of which the suite stands in for.
- [x] **4. An id that is nothing** — open
      `…/learning/course/course-v1:OpenedX+DemoX+DemoCourse/block-v1:OpenedX+DemoX+DemoCourse+type@sequential+block@nothing`.
      The address goes to the course root and on to where step 1 settled.
      *Why here:* the sequence endpoint's real answer to an id it does not know.
- [x] **5. A preview address as the learner** — in the address from step 1, insert `/preview`
      after `/learning` and press Enter. The address loses `/preview` and the stub matches.
      *Why here:* `useIsPreview` now compares against `/learning/preview`.
- [x] **6. The course bar's tabs from a unit** — on the page from step 1, click Progress and
      then go back: each opens with no page load.
      *Why here:* the shell picks the selected tab from the address, and this is the first
      Learning page whose address is under none of the tabs' own.
- **To note, not to tick: which tab the course bar shows as selected on a unit page, if
  any.** Nothing is expected here; what shows is recorded below.
  - Brian: "no tab highlighted/selected"
- [x] **7. The earlier tabs' links** — on the Course tab, expand a section and click a
      sequence title; on the Progress tab, click a subsection's title. Each lands on a unit
      with the stub matching, with no page load.
      *Why here:* those links landed on the stub page of #2188 until now.
- [x] **8. The console** — DevTools, Console, reload on a unit. No errors or warnings from
      Learning's code.

### Record

**2026-11-18, Brian, on the dev site, on `bsmith/courseware-container` (`53eaf560`).**

- Brian ticked steps 1 to 8, with no notes on any of them.
- On a unit page the course bar shows no tab as selected: "no tab highlighted/selected".
  On `master` the Course tab is selected there: the container renders the tab page with
  `activeTabSlug="courseware"`, the Course tab's id from the `course_metadata` response is
  `courseware`, and `isActiveTab` selects the tab whose id equals the slug. The shell's
  course bar does not take a slug from the page: it selects the tab whose URL is the
  longest prefix of the address (`findActiveTab`), the Course tab's URL ends in `/home`,
  and a unit's address is `…/course/<course>/<sequence>/<unit>`, under none of the tabs'.
  So this is the shell's rule and not something this layer's code sets; it is a difference
  from `master` that a learner sees.
- Details the steps ask about that were not noted and stay unrecorded: whether the Network
  tab was watched for a document request (steps 6 and 7), which sequence and subsection
  were clicked (step 7), and whether the console held warnings that are not Learning's
  (step 8).

### Checked without you

- **Lint, tests and both builds** at the layer's head, on its own commit: all pass.

### Left to the suite

| State | Test |
|---|---|
| A section id, with and without a unit; an empty section | `CoursewareContainer.test.jsx`, "when the URL contains a section ID…" (needs a section's id, which no page shows) |
| A sequence with no units; the `first` and `last` markers | `CoursewareContainer.test.jsx`, "when the sequence has no units", "when the URL contains a unit marker" |
| A preview address as staff | `CoursewareContainer.test.jsx`, "when the URL has the /preview prefix" (needs a staff user) |
| The outline failing to load | `CoursewareContainer.test.jsx`, "when the learning-sequences outline fails" |
| A learner without access | `CoursewareContainer.test.jsx`, "when receiving a course_access error_code" |
| Every address a multi-hop redirect passes through | `CoursewareContainer.test.jsx`, "the addresses a redirect passes through" |
| The position saved on moving to another unit | `CoursewareContainer.test.jsx`, "the position save" (the stub has no navigation to move with) |
| The three handlers the container passes down | `CoursewareContainerHandlers.test.tsx` |

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
