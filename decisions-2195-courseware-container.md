# Decisions: the courseware container and redirects (layer 3 of #2195)

Decisions made while building this layer. The scope, the redirect table
and the test plan are in #2195's plan and are not repeated. Renamed to
`decisions-<pr>.md` once the PR has a number.

1. **The top layer of three, one commit.** The courseware data module
   and the two route wrappers are the layers below.

2. **`CoursewareContainer.tsx` is `master`'s file, byte for byte.** Its
   imports are relative paths that exist in the package, and it reads
   nothing from the platform.
   - Open, for Brian: the position effect's dependency list is
     `[routeUnitId]`, and the package's lint reports
     `react-hooks/exhaustive-deps` on it as a warning (lint exits 0).
     `master`'s comment on the line says why: "only when the route's
     unit changes; the sequence loading later must not save". Listing
     the six values it reads would save the position when the sequence
     loads, which is the behavior the comment rules out, so the line
     is left as `master` has it.

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
   five page-rule rows; the container suite asserts the page rules on a
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

8. **The container suite renders the route array.**
   `CoursewareContainer.test.jsx` goes through `renderRoutes` at
   `/learning/…`. Where `master` reads `global.location.href`, the
   cases read `router.state.location.pathname`; where it reads its
   mocked unit's text, they read the stub's `<main>`.
   - `loadContainer` waits for the stub's `<main>`, which the tab page
     renders once the course has loaded, where `master` waited for the
     spinner to go.
   - Assertions `master` makes straight after the load, on an address
     a redirect has yet to reach, are inside `waitFor`.
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
   - `assertLoadedHeader`: the header is the shell's.
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

14. **Checks at this layer (2026-11-17).** Lint has no errors with the
    local `.jsx` block in place, and the one warning of entry 2; 48
    suites, 835 passed, 16 skipped (the five of entry 9 and the eleven
    from earlier layers); 99.95% of lines; `build` and `build:ci`
    pass. The patch counted as codecov counts it: 150 lines, none
    missed, none partial. Local commit `9a8c77f8` on
    `bsmith/courseware-container`, not pushed.

