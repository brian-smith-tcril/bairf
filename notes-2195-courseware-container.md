# Decisions: the courseware container and redirects (layer 3 of #2195)

Decisions made while building this layer. The scope, the redirect table
and the test plan are in #2195's plan and are not repeated. Renamed to
`decisions-<pr>.md` once the PR has a number.

1. **The top layer of three, one commit.** The courseware data module
   and the two route wrappers are the layers below.

2. **`CoursewareContainer.tsx` is `master`'s file apart from its
   position effect, which limits itself with a ref (settled with Brian
   2026-11-17: "ok, let's do the ref guard").** The imports are
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
   - What was weighed. React's documentation says never to suppress
     the rule ("We recommend treating the dependency lint error as a
     compilation error", Removing Effect Dependencies) and gives an
     Effect Event (`useEffectEvent`) for an effect that reacts to one
     value and reads others; the package's React, 18.3.1, has no
     `useEffectEvent`. A ref guard is not in those pages. It is in
     this codebase: `master`'s `sidebar/hooks/useUnitShiftBehavior.ts`
     compares `previousUnitIdRef.current` with the unit id in an
     effect, the ref starting `null` "so first render triggers unit
     shift logic". Leaving `master`'s line was my first
     recommendation, for a file identical to `master`'s; Brian's rule
     is to follow `exhaustive-deps` even where a config disables it,
     and the outline tab's `start_course` effect was fixed in its port
     the same way.
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

7. **`shouldRetryQuery` takes an `Error` (settled with Brian in
   review, 2026-11-18).** `master` declares it `(failureCount: number,
   error: unknown)`. A query that spreads `queryDefaults` infers its
   error type from that parameter, so every query in the package was
   typed as failing with `unknown`. `TabPage`'s `courseStatus` props
   are `UseQueryResult`, whose error type is the default `Error`. The
   three tab pages are `.jsx`, so nothing checked the mismatch until
   the container, a `.tsx` file, passed its queries to `TabPage`
   (`TS2322` in `build`). On `master` the policy is a client default
   and no query infers from it.
   - My first fix left the function alone and spread it through a
     constant typed with `Error`. Brian: "the comment is confusing.
     the line is confusing"; and, on a second version that put the
     type on `queryDefaults`: "i don't get why we need to make up the
     retry function type in queryDefaults, why are we not editing
     `shouldRetryQuery` itself?" I had ruled that out because
     `queryClient.test.ts` calls it with a plain object.
   - Now the parameter is `Error`, and the test's `httpError` helper
     returns `Object.assign(new Error(…), { response: { status } })`,
     an `Error` carrying the response as an axios failure does. No
     assertion changes; `queryDefaults` is as the layer below has it.
   - Prior art checked 2026-11-18: gradebook's `retryUnlessClientError`
     also takes `unknown` and sits in a spread options object
     (`src/data/query.ts`); its `useGradebookQuery` wrapper names the
     generics, with the error defaulting to `DefaultError`, so
     nothing is inferred from the policy. account and profile set a
     per-query retry in JavaScript. Tried and dropped:
     `Pick<UseQueryOptions, 'retry' | 'refetchOnWindowFocus'>` on
     `queryDefaults`, which fixes the error type and breaks inference
     of the data type everywhere.

8. **The container suite renders the route array, and keeps
   `master`'s fake unit, mocked one level up (settled with Brian in
   review, 2026-11-18).** `CoursewareContainer.test.jsx` goes through
   `renderRoutes` at `/learning/…`, and reads
   `router.state.location.pathname` where `master` reads
   `global.location.href`.
   - My first port asserted on the stub's `<main>` where `master`
     asserts on `.fake-unit`, dropped each unused `container` binding,
     and moved waits to fit a stub that is always on the page. Walking
     one case with Brian ("should use the resume block response…"),
     most of its changes came from the stub, not the port: the suite
     "isn't really being *ported* here so much as reworked into an
     intermediate state and that doesn't feel good".
   - `master` mocks `./course/sequence/Unit` as `div.fake-unit` under
     the real course and sequence components. Here the suite mocks
     `./course` with the same element, shown when
     the route has a unit, as the sequence shows a unit. Every
     `.fake-unit` line is `master`'s again, the two that assert it
     absent at the course root included, and the walked case differs
     from `master`'s in three lines: the config read, the header check
     and the parked navigation check. #2196 moves the
     mock back to `./course/sequence/Unit`. The mock declares prop
     types for the two ids it reads, so it needs no
     `eslint-disable`; `master`'s unit mock keeps the one it has.
   - `master`'s own mock of `./course/sequence/Unit` stays as a
     virtual mock under #2196's URL, since the skipped cases read
     `mockRenderUnitNav`.
   - The cases still push a path and then call `loadContainer()`
     (Brian, in review: the change of that call in every case made
     the file "look like it has a huge amount of changes"). `master`
     pushes onto frontend-platform's `history`, which its
     `BrowserRouter` reads. Here `history` is a small object in the
     suite whose `push` goes to the browser's history, which the
     browser router reads when it is created.
   - `loadContainer` waits for the spinner again: it waits for the
     spinner to appear, then for none to be on the page. `master`'s
     one line, `waitForElementToBeRemoved(screen.getByRole('status'))`,
     cannot be kept: the routes load lazily, so the spinner is not
     there when the render returns, and when it is awaited first it is
     already gone by the time the test resumes; the helper then holds
     a detached node whose topmost ancestor still contains it, and
     times out. With the spinner wait back, the mocked course is the
     fake unit alone, with no `<main>` to wait on.
   - The stub is rendered by `course/index.test.tsx`, through the
     routes with the requests mocked: the three ids it prints, and no
     page-rule diagnostics. Both go with the stub in #2196.
   - The assertions `master` makes straight after the load stay as
     they are: the fake unit is on the page only once a redirect has
     reached a unit, as on `master`. The suite passed five runs in a
     row before the amend.
   - "Should ask for the resume block again on a later visit" puts its
     link in a layout route around the route array.
   - "Saves the position on each unit change" is parked whole, as
     `it.skip` under #2196's URL, its body `master`'s line for line.
     My first port kept the name and drove it with `router.navigate`
     where `master` clicks the real navigation's Next; Brian, in
     review: "before it was using userEvent to have the test click
     through things, now that isn't happening". The effect is this
     layer's, so two new cases under "the position save" cover it,
     clicking links placed in a layout route around the route array
     (the idiom of `master`'s "later visit to the course root" case):
     nothing saved on opening a unit, then one save for each move;
     and a save on coming back to a unit whose sequence is still
     cached. Against `master`'s effect both pass; against a ref that
     starts at the route's unit the second fails; with no guard both
     fail.
   - The suite runs with retries off, as `master`'s does. `master`'s
     test client sets `retry: false` for every query. Here each query
     carries the policy in its own options, which a client cannot
     override, so the suite mocks `@src/queryClient` with
     `queryDefaults.retry` false. My first port changed two expected
     counts on a failing lookup from 1 to 4; Brian, in review: that
     "is changing the behavior being tested". Both read
     `toHaveLength(1)` again.
   - The two blocks this layer adds ("the position save", "the
     addresses a redirect passes through") are the last two in the
     file, after `master`'s "request count", so `master`'s blocks keep
     their order. They sat before "when the course has no sections",
     and with `master`'s access-denied block removed just after it the
     diff paired the wrong lines and showed that block as replaced
     (Brian, in review); it differs from `master`'s in one line.
   - The nine "when receiving a course_access error_code" cases are
     back (Brian, in review: "let's put it back, i understand not
     needing it but i want the diffs (*especially for test files*) to
     be minimal/clear"). #2189 had this issue drop them, since
     `shared/access.test.ts` covers each code's destination and
     `TabPage.test.jsx` the redirect; all nine destinations are in
     `access.test.ts`. The block runs here as `master` has it.
   - The suite renders under a browser router. `tests/render.tsx`
     gains `renderBrowserRoutes(routes)`, a `createBrowserRouter` over
     jsdom's address, beside the memory-router `renderRoutes` the
     package's other suites use. `master`'s suite renders under
     `BrowserRouter` and asserts on `global.location.href` and
     `history.replaceState`; a memory router has neither. With it:
     the suite's `history.push` is `window.history.pushState` under
     `/learning`; the 33 addresses the cases expect differ from
     `master`'s by `/learning` alone; "should stay on the sequence
     without a redirect to it" is `master`'s, spy and all; and the
     `audit_expired` case expects `uhoh%20oh%20no` as `master` does,
     which a memory router would hold unencoded. `afterEach` disposes
     of the router.
   - The suite answers the outline tab's request
     (`/api/course_home/outline/…`) in its `beforeEach`. Two of the
     restored cases redirect a denied learner to the course home,
     which renders the real outline tab; with its request unanswered
     the tab threw (entry 16), and the package's suite fails on a
     console error, which it did in two runs of five.
   - What still differs from `master` inside its cases, the config
     reads and `/learning` aside: the render calls; the header helper
     and its seven calls; the parked navigation helper and its six
     calls; six `it.skip` lines; the link case's layout route; three
     statements the package's lint splits over lines. No expected
     value differs. The file's changed lines against `master`'s went
     676, 622, 512, 491; of the 491, 167 are the two blocks added at
     the end, and the config reads and `/learning` account for about
     115 more.
   - The rule this file is held to, after three rounds of review: the
     cases stay `master`'s, the harness around them adapts, and a case
     that cannot run is parked whole, not rewritten.

9. **Left out or parked.**
   - `assertLoadedHeader`: the header is the shell's, and nothing in
     the package renders `.learning-header` (`HeaderSlot` is `dropped`
     since #2234; the org and title line is #2193's widget, which this
     suite never renders). Brian, reviewing: removal is fine, "but it
     was serving the purpose of proving both course metadata and
     course blocks loaded". `assertMetadataAndOutlineLoaded` stands
     where it was called, seven times: it waits for the course-home
     metadata, courseware metadata and outline queries to read
     `success`, the idiom `waitForMetadataWithOutlinePending` already
     uses in this suite. "Blocks" in `master`'s comment is the
     learning-sequences outline, which the suite builds from its
     course blocks. Brian: "that doesn't quite feel the same". It is a
     stand-in: with the course component stubbed, nothing on the page
     depends on the outline. `master`'s `Course.jsx` sets the page
     title to the sequence's, section's and course's titles from the
     outline once the outline query succeeds, so after #2196 the check
     can read `document.title`. The helper carries a one-line comment
     with #2196's URL so that port replaces it ("yeah, add the
     marker"). The org and number return only in #2193's widget.
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

10. **Each hop of a multi-hop redirect has a case.** `renderAt`
    records every pathname the router is at, from `router.subscribe`.
    Seven cases assert the whole list: the course root with no resume
    position; a section; a section and a unit; a unit no sequence
    holds; an id that is none of the three; a preview sequence for a
    user who is not staff; a preview section for staff. The ones that
    fall back to the course root go on to the resume position, so the
    list shows the root as a hop.

11. **`CoursewareContainerHandlers.test.tsx` calls the three
    handlers.** It mocks `./course` as three buttons and
    `./course/celebration` as a spy, in a file of its own beside the
    suite, as `ProgressTabComponents.test.tsx` and
    `OutlineTabComponents.test.tsx` are beside theirs. Six cases: the
    completion request with the unit's key; the celebration recorded
    when the next sequence is in another section and the first section
    is celebrated; nothing recorded with the next sequence in the same
    section, with the flag off, and on the course's last sequence;
    nothing requested by the previous handler. The factory's output is
    cast to the shape the cases read, since the factory is JavaScript
    and TypeScript reads the trees it fills in as empty (`build:ci`
    type-checks the tests).

12. **`urls.test.ts`** matches each of the four forms against the
    route array and tests the guard for both roles.

13. **Factories.** `buildBinaryCourseBlocks` comes with the suite. No
    commented line naming #2195 remains in the package.

14. **Checks at this layer (2026-11-17).** Run on the commit as
    rebased onto the reviewed layers below: lint clean, with no
    warning, with the local `.jsx` block in place; 49 suites, 846
    passed, 17 skipped (the six of entry 9 and the eleven from
    earlier layers); 100% of lines; `build` and `build:ci` pass. The
    patch counted as codecov counts it: 154 lines, none missed, none
    partial. Local commit `53eaf560` on `bsmith/courseware-container`,
    not pushed.

15. **Seen once, not this layer's: an intermittent failure in the
    outline tab's suite (2026-11-17).** One full run of this layer,
    after a change that only added a comment to the container suite,
    failed `OutlineTab.test.jsx` "Certificate Available Alert ›
    appears" (`queryByText('Your grade and certificate status will be
    available soon.')` found nothing). The case is `master`'s,
    unchanged, in #2252's layer. Run alone three times, in its whole
    suite once, and in the next full run it passed; some sixteen other
    full runs the same day passed. Not diagnosed: the case asserts
    with `queryByText` straight after `fetchAndRender`, which waits
    for the heading and for the spinner to go, so an alert added a
    tick later would be missed under load. Put to Brian. Seen a second
    time on 2026-11-18 (14:40 UTC), again in a full run and again
    passing on the next one: twice in about twenty full runs over the
    two days, never when the suite ran alone.

16. **Seen while restoring the access cases, same on `master` by
    reading, not this layer's: the outline tab throws for a denied
    learner whose outline request fails.** `TabPage`'s `deriveView`
    returns `isDenied` before it looks for a failed tab-data query,
    and the outline tab shows its page to a denied learner, so
    `OutlineTab` renders with no outline data and its nested
    destructure of `courseBlocks` throws. `master`'s line has `?? {}`
    after `.data`, which only moves the throw to `courseBlocks`; the
    port's line has none. `master`'s container suite
    lands on that page in two cases with the outline request
    unanswered and does not notice, having no console check. Put to
    Brian as a possible discovery issue.

