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
