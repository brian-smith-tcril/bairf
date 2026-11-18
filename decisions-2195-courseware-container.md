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
   - Held by two cases. "Saves the position on each unit change": no
     save after the load, one for each move. "Saves the position on
     coming back to a unit of a sequence that is still loaded" (new):
     a mount with the sequence already in the cache saves, as
     `master`'s does. Run against three other bodies before the amend:
     `master`'s effect passes both; a ref that starts at the route's
     unit fails the new case; the full dependency list with no guard
     fails both.
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

7. **`queryDefaults` types its retry policy for the library's default
   error type.** `shouldRetryQuery` takes `error: unknown`, and a
   query that spreads `queryDefaults` infers `unknown` as its error
   type from it. `TabPage`'s `courseStatus` props are
   `UseQueryResult`, whose error type is the default `Error`. The three
   tab pages are `.jsx`, so nothing checked the mismatch until the
   container, a `.tsx` file, passed its queries to `TabPage`
   (`TS2322` in `build`). On `master` the policy is a client default
   and no query infers from it. `queryClient.ts` assigns
   `shouldRetryQuery` to a constant typed `(failureCount: number,
   error: Error) => boolean` and spreads that; it is the same
   function, and `queryDefaults.retry` is still `shouldRetryQuery`.

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
     and the parked navigation check. The file's changed lines against
     `master`'s went from 676 in the first port to 512. #2196 moves the
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
     `BrowserRouter` reads. Here `history` is a two-line object in the
     suite that keeps the pushed path, and the render starts the
     memory router there, under `/learning`.
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
   - "Should stay on the sequence without a redirect to it" asserts
     the router was at one pathname only; `master` spied on
     `history.replaceState`.
   - "Should ask for the resume block again on a later visit" puts its
     link in a layout route around the route array.
   - "Saves the position on each unit change" moves with
     `router.navigate`; `master` clicked the real navigation's Next.
   - Two counts on a failing lookup are 4 where `master` has 1: the
     resume request and the parent-sequence request answer 500, and
     each query carries the retry policy in its own options. `master`'s
     test client turned retries off for every query; the package's
     cannot, since a query's own option wins.

9. **Left out or parked.**
   - The nine "when receiving a course_access error_code" cases:
     `shared/access.test.ts` and `TabPage.test.jsx` test the redirect
     where it is made (#2234).
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
   - Five cases are `it.skip` under #2196's URL: the first-section
     celebration record, the sequence navigation slot, the completion
     check on Next, the disabled Next control, and the page title.
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
    warning, with the local `.jsx` block in place; 49 suites, 837
    passed, 16 skipped (the five of entry 9 and the eleven from
    earlier layers); 100% of lines; `build` and `build:ci` pass. The
    patch counted as codecov counts it: 154 lines, none missed, none
    partial. Local commit `665e934e` on `bsmith/courseware-container`,
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

