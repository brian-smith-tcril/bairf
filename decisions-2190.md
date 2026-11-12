# Decisions — port the progress tab (#2190)

Decisions made while implementing. The scope, the import and config
mapping, the role links, the entrance exam fix and the test changes are
in #2190's plan and are not repeated.

1. **Findings before the first commit (2026-11-10).** Read on `master` at
   `363bc1e4`, with the package at `c78935cc`:
   - `GetCourseExitNavigation` throws without courseware metadata. Its
     first statement destructures `entranceExamData: { entranceExamPassed }`
     from `useCoursewareMetadata(courseId, { enabled: false }).data ?? {}`,
     and the nested pattern reads a property of `undefined` when the data
     is missing. `master` calls it only from the unit navigation, under
     the courseware container that loaded the query. The plan's test case
     for it, "no courseware data: inactive, default text", describes a
     result the function cannot return, so the case is not written in
     the shared-modules commit, where both courseware hooks are stubs
     returning no data.
   - Three rules of `master`'s `src/index.scss` style the progress tab
     and are in no partial: `.greyed-out` (a subsection title without a
     link), `.locked-overlay` with its `.grades` variant (the grade
     breakdown of a fully locked course: dimmed, `pointer-events: none`,
     capped height) and `.raised-card` (the completion, certificate,
     grade and breakdown cards). The plan's Styles line names only the
     two partials.
   - Four components set `defaultProps` on a function component
     (`AssignmentTypeCell`, `CurrentGradeTooltip`, `GradeRangeTooltip`,
     `PassingGradeTooltip`), which React 18.3 warns about and the
     package's console hook fails on, as it did for the dates tab's
     `Day` and `UpgradeToCompleteAlert`.
   - The plan's
     subsection link, `resolveRouteByRole(coursewareRole, { courseId,
     sequenceId: blockKey }).url`, resolves to the bare course path and
     drops the block key. `coursewareRole` is declared on three routes
     and `getUrlByRouteRole` returns the first, the index route, as
     `src/app.test.ts` pins (`/learning/course/:courseId/`, "not a
     sequence, unit or preview path"); react-router's `generatePath`
     fills the params the path names and ignores the rest. Measured
     2026-11-10 with react-router 6.30.6:
     `generatePath('/learning/course/:courseId/', { courseId, sequenceId })`
     returns `/learning/course/<courseId>`, where
     `/learning/course/:courseId/:sequenceId` returns the subsection's
     path. As planned, every subsection title would link to the course's
     courseware entry, not to the subsection.
     Settled with Brian 2026-11-10: the role's URL is taken as the base
     of `/:sequenceId` and `/:sequenceId/:unitId`, and one function,
     `getCoursewareUrl(courseId, sequenceId?, unitId?)` in
     `courseware/urls.ts`, builds every courseware URL from it, so the
     assumption has one home, a comment where the role is declared and
     a test against the route array. #2190's plan is amended (What
     moves, the subsection bullet, the tests, commit 1).
     Amended 2026-11-11: the comment is gone (entry 10), and the
     function is `getSequenceUrl(courseId, sequenceId)`, the sequence
     form alone, with a throw in place of the `!` (entry 15).

2. **The shared-modules commit (2026-11-10).** Made while porting:
   - `utils.test.ts` gets the `logClick` and `logVisit` cases and no
     `GetCourseExitNavigation` case (entry 1). Its lines are the
     package's only uncovered ones after this commit: the
     `course-exit` directory is at 54.76% of lines, the package at
     97.53 against the 96.15 bar. The four cases were kept on review,
     with their org changed (entry 14).
   - The courseware stub is a hook type with two functions assigned to
     it, `(courseId, options?) => { data: undefined }`, not functions
     with unused parameters: the package's lint reports an unused
     parameter even with a leading underscore
     (`@typescript-eslint/no-unused-vars`), and the toolbar stub
     declares its props the same way, through `FC<InstructorToolbarProps>`.
   - Eight messages in `course-exit/messages.ts` gain a `description`:
     the package's lint enforces `formatjs/enforce-description`, and
     `endOfCourseHeader`, `endOfCourseTitle`, `microBachelorsLearnMore`,
     `microMastersLearnMore`, `microMastersMessage`, `upgradeButton`,
     `upgradeLink` and `viewGradesButton` had none on `master`. Each
     says where the course exit page shows the string; ids and default
     messages are untouched. All eight were rewritten for translators
     on review (entry 13).
   - `getCourseExitMode`'s two `indexOf` comparisons become `includes`,
     the autofix for `@typescript-eslint/prefer-includes`.
   - `links.test` is `links.test.tsx`, not the plan's `.jsx`: a new file
     is TypeScript.
   - The profile link drops one trailing slash from the role's URL
     before appending `/u/<username>`, as `ProfileLinkMenuItem` does
     (`shell/menus/ProfileLinkMenuItem.tsx` in openedx/frontend-base,
     read in the installed `2.0.0-alpha.17`). Why Learning builds the
     URL itself, and the comment naming openedx/frontend-base#349, are
     entry 16.
   - The hooks return `resolveRouteByRole(role, { courseId })?.url`.
     The `?.` covers a site whose `apps` no longer carry Learning's
     routes, which cannot be the site running this code; no test feeds
     it.
   - The links test restores the site config after each case with
     `setSiteConfig` of the object read at load: `mergeSiteConfig`
     builds a new object and leaves the old one untouched.

3. **An external route cannot carry a route param, by an unrecorded
   narrowing (read 2026-11-10).** Found while settling
   `getCoursewareUrl`.
   - openedx/frontend-base at `72d7053` (`main`, 2026-11-02),
     `runtime/routing/utils.ts`: `resolveRouteByRole` returns
     `isInternal ? generatePath(path, params) : path`, and
     `utils.test.ts` pins it ("resolves an external route to its URL as
     configured", called with `{ courseId: 'c1' }`). `ExternalRoute` is
     `{ role, url }`. An external entry written as a path (a single
     leading `/`) is classed internal and does get its params filled.
   - No ADR covers it: of `docs/decisions/`, only 0013 mentions roles,
     for the course bar's `provides`. The helper came in with
     openedx/frontend-base#320 (arbrandes, merged 2026-09-22, closing
     #317 and #319); its body states the behavior ("an external URL is
     returned as configured") without a reason, and it has no review
     comments.
   - The two hand-rolled versions #320 replaced did substitute params
     into an external URL: openedx/frontend-app-gradebook#627 called
     `getUrlByRouteRole(role)?.replace(':courseId', courseId)`, and
     `src/utils/routeByRole.ts` in
     openedx/frontend-app-instructor-dashboard#246 ran
     `url.replace(`:${name}`, value)` for each param before testing
     whether the URL was absolute. Neither tested an external URL with
     a param.
   - A likely mechanical cause, not stated anywhere: `generatePath`
     cannot take an absolute URL. On react-router 6.30.6,
     `generatePath('https://lms.example.com/courses/:courseId/progress', { courseId })`
     returns `https:/lms.example.com/courses/<courseId>/progress`, the
     `//` collapsed.
   - Consequence for Learning: even once openedx/frontend-base#348
     lets a site point a role at an external route, an absolute URL for
     the dates, outline, progress or courseware role cannot name the
     course.
   - Settled with Brian 2026-11-10: it is frontend-base's question, so
     it goes there as a discovery issue of its own,
     openedx/frontend-base#349, beside openedx/frontend-base#348, and #2190 does nothing for the external
     case. `getCoursewareUrl` joins the segments onto the resolved URL
     with no trailing-slash handling, and its test asserts the three
     forms against Learning's routes only. Nobody can reach the
     external case today: a site cannot point `coursewareRole` at an
     external route while Learning is installed.
     Amended 2026-11-11: the function is `getSequenceUrl` and its test
     asserts the one form it builds (entry 15).

4. **On a target user's page the certificate card ignores the courseware
   metadata cache (settled with Brian 2026-11-10).** The plan stopped
   `ProgressTab` fetching the query on `progress/:targetUserId` and left
   `CertificateStatus.jsx` unchanged, which keeps the card's `null` only
   while the cache is empty. It need not be: the query client is the
   shell's, the key (`[appId, 'courseware', 'metadata', courseId]`)
   names no user, and the requester's own progress page fills it with
   this PR, a courseware page once #2195 lands. A staff member who
   never sat the exam reports `false` for themselves (#2244), so
   arriving at a learner's page without a page load would hide that
   learner's card. Nothing in Learning links to
   `progress/:targetUserId`; the arrival would be from another app on
   the same site, not checked.
   - The rule: the page behaves as its `enabled: false` read behaves
     on a fresh load, which finds no data and passes `null`.
     `CertificateStatus` reads `targetUserId` from the route and
     passes `null` when it is set.
   - The fetch and gate on the learner's own page are #2243's fix and
     stay as planned; the two `targetUserId` conditions (`ProgressTab`,
     `CertificateStatus`) are the workaround and each carries #2244's
     URL, the issue whose backend change removes them.
   - The plan, #2190's body mirror and #2244's body mirror are amended;
     the test seeds the requester's failing status and asserts the
     card as with the cache empty.

5. **`GetCourseExitNavigation` gets no test in #2190 (settled with
   Brian 2026-11-10).** `master` has no direct test of it:
   `course-exit/utils.test.ts` covers `getCourseExitMode` only, and the
   function runs through the suites of its two callers,
   `SequenceNavigation.jsx` and `UnitNavigation.jsx`, which port with
   #2196. That is decision 32's first case (lines `master` tests only
   through a suite this PR does not port wait for that port). The
   plan's case for it could not be written (entry 1), and a direct
   test with the metadata query seeded, possible from the entrance
   exam commit on, was weighed and not taken. The function is left as
   on `master`, the PR names its lines with #2196, and the plan's test
   bullet and Coverage section are amended. Codecov will likely list
   the lines on the PR while its check passes; revisit if the report
   looks bad.

6. **Standalone component tests: the defaults are tested, and
   `CertificateStatus` keeps its `?? {}` (settled with Brian
   2026-11-10).** `ProgressTabComponents.test.tsx` renders one
   component alone.
   - The four default parameters that replaced `defaultProps`
     (`tooltipClassName` twice, `iconButtonClassName`,
     `AssignmentTypeCell`'s `footnoteId` and `locked`) are left unset
     by no caller, so only a standalone render takes them. They are
     tested: an optional prop is the component's interface.
   - `CertificateStatus`'s `?? {}` after
     `useCourseHomeMeta(courseId, { enabled: false }).data` cannot run
     on the page, since `TabPage` has loaded that query before the
     card renders. Decision 32 of #2189 dropped the same default in
     `Timeline` and `UpgradeToCompleteAlert` because it only moved a
     throw. Here it changes the outcome: without the metadata
     `isEnrolled` is `undefined`, `getCourseExitMode` returns
     `disabled`, no card renders and the `visited` event carries
     `certificate_status_disabled`; nothing throws after it, the next
     read being the progress data. By decision 32's rule such a guard
     keeps its line and gets a test that feeds it the input. Dropping
     it was proposed first, on a wrong reading of decision 32.

7. **Body corrections drafted for one PATCH (2026-11-10).** What the
   port found that the plan did not say, now in the plan and the body
   mirror: 40 files in `master`'s progress directory, 53 moving;
   `links.test.tsx`; the three `index.scss` rules (entry 1); the
   console fixes beyond the hover trigger (`defaultProps`, the
   `GradeSummaryTable` effect, `NoticeRow`'s prop type, the `Popover`
   id, the Paragon patterns); a Lint bullet (message descriptions,
   `includes`, the `viewBox` on a `<g>`, which was a
   `react/no-unknown-property` error and not console output, stale
   `eslint-disable` comments); the completed fixtures,
   `preventNavigation`, the `beforeAll` import of the tab's module;
   the cases added for coverage.

8. **The progress tab commit (2026-11-10, `a5517082`).** Beyond what
   entries 1 and 7 and the body say:
   - `ProgressTab.test.jsx` was generated from `master`'s file by a
     script, so its diff against `master` is the header, the render
     seam, the fixtures and the added describes; no case was retyped.
   - The right-to-left cases need `getLocale` to answer `ar`, so the
     suite mocks `@openedx/frontend-base` with the real module and
     `getLocale` wrapped in `jest.fn`, the per-file form the package
     already uses.
   - The factory's second subsection gets `learner_has_access: false`,
     not `true`: two `api.test.js` cases rely on the value being falsy,
     as it was when absent.
   - `AssignmentTypeCell`'s `footnoteMarker: null` default is dropped
     with its `defaultProps`, as decision 11 of #2189 did for `null`
     defaults.
   - The describe added for further certificate states is named
     "Certificate status card", and the components test's header says
     only that each case renders one component alone: a test name
     states the assertion, not what `master` lacked.
   - One partial is left in this commit's files and named in the PR:
     `SubsectionTitleCell.jsx` line 36, the `= 'a'` default for the
     link component, taken only when `getLinkProps` returns an `href`,
     which needs the courseware role to resolve to an external route
     (openedx/frontend-base#348). Entry 3 settled that nothing is
     asserted for that case.
   - Checks at this commit: lint passes; 35 suites, 400 passed, 7
     skipped; 98.95% of lines; `build` and `build:ci` pass.

9. **The entrance exam commit (2026-11-10, `eba3a06e`).**
   - The cache case does not seed the cache. `renderRoutes` creates
     its own query client, so the case renders the requester's own
     progress page with a failed entrance exam, then calls
     `router.navigate` to `progress/10`: the arrival entry 4
     describes. Checked 2026-11-10 by removing `CertificateStatus`'s
     condition: that case alone fails, the other four pass.
   - The gated learner's `visited` event carries
     `certificate_status_variant: undefined` with the factory's empty
     `certificate_data`. The card's event code has no entrance exam
     variant: in `entranceExamFail` mode it sends the progress
     response's `certStatus` untouched, as on `master`. The case
     asserts that literal value and one call. The plan's "reflects it"
     is looser than what the code does.
   - The progress suite's `beforeEach` answers the courseware metadata
     request: under the adapter an unmocked request rejects, and the
     tab now waits for this one on the learner's own page. A failed
     courseware metadata request therefore shows the tab's error view,
     which follows from gating on it (#2243).
   - Manifest: one line each for `api.js`, `apiHooks.ts`,
     `coursewareMeta.ts` and the two factory files. The plan's "split
     manifest line" does not fit the manifest's meaning of a split
     (several targets for one legacy path); the rest of `api.js` and
     `apiHooks.ts` lands on the same targets with #2195.
   - `apiHooks.test.tsx` and `api.test.ts` sit at the paths #2195's
     port of `master`'s tests will use, and merge with them there.
     The hook's wrapper is a named component returned in an object,
     as the course-home hooks test builds it; lint requires a display
     name.
   - Left uncovered and named in the PR: `course-exit/utils.js` lines
     83-116, `GetCourseExitNavigation` (#2196, entry 5), and the
     `useMinimalCourseOutline` stub's function (#2195).
     `CertificateStatus.jsx` is at 100% of lines and branches.
   - Checks at this commit: lint passes; 37 suites, 412 passed, 7
     skipped; 99.04% of lines against the 96.15 bar; `build` and
     `build:ci` pass.
   - Commit 1 is now `66ccbd91`, amended with `courseware/urls.ts`,
     its test and the comment on `coursewareRole`.

10. **`coursewareRole` carries no comment (settled with Brian
    2026-11-11).** Commit 1 put `// Its URL is the base of /:sequenceId
    and /:sequenceId/:unitId, which getCoursewareUrl appends.` above the
    constant in `src/constants.ts`. It described `getCoursewareUrl` from
    another file and restated what `src/courseware/urls.ts` shows. A
    line in `urls.ts` saying `resolveRouteByRole` returns the index
    route was weighed and dropped for the same reason: the code shows
    it. The facts stay pinned by tests: `src/app.test.ts` asserts the
    role resolves to the course's index route, and `urls.test.ts`
    asserts the three forms match routes carrying the role (the
    sequence form only, since entry 15). The reasoning is entry 3. The comment comes out of commit 1, and the
    plan and #2190's body lose the clause naming it.
    Done 2026-11-11: the line is out of `src/constants.ts` and commit
    1's message no longer names it. The branch is now `fa0757c1`,
    `1cba4529`, `1d5eb961` (were `66ccbd91`, `a5517082`, `eba3a06e`);
    the tip's tree differs from the old tip by that one line. Checks at
    the tip: lint passes; 37 suites, 412 passed, 7 skipped; 99.04% of
    lines; `build` and `build:ci` pass.

11. **The course-tabs hooks keep resolving Learning's roles (settled
    with Brian 2026-11-11; effort decision 38, confirmed).** Reviewing
    the port diff of `course-tabs/hooks.test.tsx`, Brian asked whether
    the in-page links should instead do what the course bar's tabs do.
    A version that followed `tabs[].url` (a `Link` to its path when
    the path is a route in this site, an anchor otherwise, with a copy
    of frontend-base's unexported `isClientRoute`) was written in the
    working tree, tested, and discarded before any commit. Brian's
    rule: if Learning has a role for the destination, the role gives
    the URL and the metadata's URL does not matter; a tab nothing
    serves is linked by its URL, and that only arises in the course
    bar. The committed hooks already do the first half, and the
    progress page links to no other tabs. Nothing was filed on
    frontend-base and openedx/frontend-base#348 stands as written.
    - The hooks test no longer types the path out. Its first case
      matched `/learning/course/${courseId}/${segment}`, with a
      `segment` column that named nothing in the code under test; it
      now matches the returned URL against the exported route array
      and expects the matched route to carry the tab's role with
      `{ courseId }` as its params, the pattern of
      `courseware/urls.test.ts`. The case keeps `master`'s name,
      "returns the tab's url from the course metadata on the page":
      Brian reads it as the URL built from the course metadata, which
      holds here (no URL unless the metadata lists the tab), and a
      rename to say where the URL comes from was too literal a reading.
      Folded into commit 1; the branch is now `58fb20ff`, `f45debb3`,
      `3431fdfd`, differing from `1d5eb961` in that file only.
      Checks at the tip: lint passes; 37 suites, 412 passed, 7
      skipped; 99.04% of lines; `build` and `build:ci` pass.
    - Findings 2026-11-11, openedx/openedx-platform at `d3a86602dc`,
      on what `tabs` in the `course_metadata` response can hold (Brian
      asked). `CourseHomeMetadataView` serializes
      `get_course_tab_list(user, course)`
      (`lms/djangoapps/courseware/tabs.py`): the course's persisted
      tabs plus the dynamic ones, of every type registered under the
      `openedx.course_tab` entry point (`pyproject.toml`), which a
      third-party plugin can add to. Each `url` is
      `request.build_absolute_uri(tab.link_func(course, reverse))`.
      By where the link points:
      Learning pages, built from `LEARNING_MICROFRONTEND_URL`:
      `courseware` (`default_course_url`, `/home`), `dates`,
      `lti_live` (`/live`), and `progress` when
      `course_home_mfe_progress_tab_is_active`, else the platform's
      Django template `progress` view.
      Another frontend or a Django template page by a flag: `discussion`,
      `instructor`, `ccx_coach`.
      Legacy frontend (Django template) pages: `static_tab` (a custom page, id
      `static_tab_<url_slug>`), `wiki`, `teams`, `edxnotes`,
      `syllabus`, the textbook tabs, `lti_tab`.
      An arbitrary URL the course author enters: `external_link`
      (`ExternalLinkCourseTab`, `allow_multiple`) and
      `external_discussion`.
      So a course can list tabs no frontend app serves, and the list
      is open-ended.
    - Findings 2026-11-11, same checkout, on whether the base of the
      dates, progress and course tab URLs can differ by course (Brian
      asked). It cannot. `get_learning_mfe_home_url` and
      `make_learning_mfe_courseware_url`
      (`openedx/features/course_experience/url_helpers.py`) read one
      value, `configuration_helpers.get_value('LEARNING_MICROFRONTEND_URL',
      settings.LEARNING_MICROFRONTEND_URL)`, and append
      `/course/<course key>/...`. `get_value` reads the current site's
      `SiteConfiguration` (`get_current_site_configuration`), so the
      base can differ by the site the request is served on, never by
      course or org; nothing in the path takes the course. What does
      differ by course is which page a tab points at, through two
      `CourseWaffleFlag`s: `progress` is the learning URL only when
      `course_home_mfe_progress_tab_is_active(course.id)` (and never
      for a deprecated course key), else the platform's Django
      template `progress` view; `courseware` is
      `<base>/course/<id>/home`, or the courseware URL
      `<base>/course/<id>` when `DISABLE_COURSE_OUTLINE_PAGE_FLAG` is
      on for the course. `dates` has no flag.

12. **The course-tabs URL getters become presence checks (settled with
    Brian 2026-11-11).** The committed `hooks.ts` replaced `master`'s
    `useTabs` with `useTabUrl(getTabUrl, role)`, which called a URL
    getter only to test its result (`!getTabUrl(tabs)`). Brian found
    the shape confusing: for a hook such as `useProgressTabUrl` the URL
    always comes from the role, the link is absent when the metadata
    lists no such tab, and the metadata's URL is never read, so the
    code should say that and not hide it behind a URL's truthiness.
    - `course-tabs/utils.ts`: `getCourseOutlineUrl`, `getDatesTabUrl`
      and `getProgressTabUrl`, whose only caller is `hooks.ts`, become
      `hasCourseOutlineTab`, `hasDatesTab` and `hasProgressTab`, the
      shape of the existing `hasDiscussionTab`. The file ported with
      #2189 (merged as #2234), so this PR changes it; `utils.test.ts`
      follows.
    - `course-tabs/hooks.ts`: `useTabs` is `master`'s again, and the
      three exported hooks are one-liners over a shared
      `useTabUrl(hasTab: boolean, role)`, which guards
      (`if (!hasTab || !courseId) { return undefined; }`) and then
      returns `resolveRouteByRole(role, { courseId })?.url`. Each call
      site passes the check's result, as in
      `useTabUrl(hasDatesTab(useTabs()), courseDatesRole)`, so
      `master`'s `getDatesTabUrl(useTabs())` shape is still visible
      and the file's diff against `master` is the helper and three
      changed lines. How it got there, each step turned down by Brian
      on reading the diff: a lookup hook (`useRouteUrl`) called ahead
      of the check, which the rules of hooks force and which read
      backwards; a variant with non-null assertions on the course id
      and the resolved route; and three spelled-out hooks with a guard
      each, which read clearly and repeated themselves.
    - Behaviour and `hooks.test.tsx` are unchanged.
    - Folded into commit 1, whose message names the change; the branch
      is now `7788a5ba`, `6df958a9`, `e21a28e8`, differing from
      `3431fdfd` in `course-tabs/hooks.ts`, `utils.ts` and
      `utils.test.ts` only. Checks at the tip: lint passes; 37 suites,
      412 passed, 7 skipped; 99.04% of lines; `build` and `build:ci`
      pass. #2190's body was PATCHed from the mirror first.

13. **Message descriptions are written for translators (Brian,
    2026-11-11).** `formatjs/enforce-description` requires a
    description on every message; nine messages `master` leaves
    without one got theirs in this PR (eight in
    `course-exit/messages.ts`, `minimumGrade` in the progress tab's
    `credit-information/messages.ts`). The first versions described
    the code path that renders the string ("Heading shown to a learner
    who reached the end of the course without a passing grade" for
    "You’ve reached the end of the course!"), which says more than the
    message does and is not what a translator needs. The rule: say
    what kind of text it is and what it is for, at the level of the
    descriptions `master` already has in the file ("Link to user’s
    dashboard", "Button to view the course schedule"), and add context
    only where it changes the translation, such as a fragment dropped
    into another sentence.
    - Approved and applied: `endOfCourseHeader`, `endOfCourseTitle`,
      `microBachelorsLearnMore`, `microMastersLearnMore`,
      `microMastersMessage`.
    - `upgradeButton` ("Upgrade now") takes `master`'s own description
      of the same string in `course-home/progress-tab/grades/messages.ts`,
      "Text for button that redirects to the upgrade page"; the first
      rewrite, "Button to upgrade in order to get a certificate", said
      nothing clear.
    - `viewGradesButton`: "Button to view the learner’s grades",
      approved. `upgradeLink` ("upgrade now", a fragment inside the
      upgrade footnote's sentence): "Anchor text for the link to the
      upgrade page"; Brian turned down a version that quoted the
      sentence it ends, and the sentence's own message shows the
      `{upgradeLink}` placeholder. Applied without an explicit yes on
      the trimmed wording.
    - `minimumGrade` (commit 2): "The minimum grade requirement, in
      the list of requirements for course credit". Brian accepted it
      as better than the alternatives, not as good. "Label" and "Name"
      in earlier versions did not say what the text is (the title of
      one row in the requirements list), and the "(course credit)"
      parentheses copied from neighbouring descriptions had no reason
      anyone could give.
    - With all nine applied the branch is `b6ea5f36`, `e1d63a35`,
      `5db789f1`; lint, the suite (37 suites, 412 passed, 7 skipped),
      `build` and `build:ci` pass at the tip.

14. **The `logClick` and `logVisit` cases stay; their org is not
    `edX` (settled with Brian 2026-11-11).** On `master` (the legacy
    tree's `coverage/lcov.info`, run 2026-10-29) the two functions'
    `sendTrackEvent` calls run only through `CourseExit.test.jsx`,
    which asserts neither event name nor payload and ports with #2202,
    and the two falsy-guard `return;` lines run in no test. By
    decisions-2189 entry 32 the guard cases belong in this PR and the
    two "sends" cases would have waited for #2202; nothing this PR
    ports calls either function. Brian kept all four. The literals in
    the four cases are `'OpenedX'` and
    `'course-v1:OpenedX+DemoX+DemoCourse'`, the id `routes.test.tsx`
    already uses; the `edX` in the other test files comes from
    `master`'s tests and factories and is untouched. Folded into
    commit 1: the branch is `0e5e9c19`, `fbf6b905`, `80d4ac32`; lint,
    the suite (37 suites, 412 passed, 7 skipped; 99.04% of lines),
    `build` and `build:ci` pass at the tip.

15. **`getSequenceUrl(courseId, sequenceId)` replaces `getCoursewareUrl`
    (settled with Brian 2026-11-11; amends entry 1).** Brian found
    `getCoursewareUrl(courseId, sequenceId?, unitId?)` hard to read:
    the `[url, sequenceId, unitId].filter(Boolean).join('/')` join was
    too clever and the `!` on `resolveRouteByRole` was the assertion
    he had turned down in `course-tabs/hooks.ts`.
    - The join existed only to fold three URL forms into one function
      with optional ids. This PR calls one form (the subsection link,
      a course id and a sequence id), so `courseware/urls.ts` ports
      that form alone. The unit form (`UnitButton.tsx`,
      `UnitLinkWrapper.tsx`, `JumpNavMenuItem.jsx`, the sequence
      navigation's `hooks.js` on `master`) is added beside it, in the
      same file, with its first caller in #2196. The file stays the
      one home of the assumption that the role's URL is the base of
      `/:sequenceId`.
    - The `!` becomes a guard that throws `No route provides the role
      <role>`. `resolveRouteByRole` returns `null` only when no route
      provides the role, and the code runs under Learning's own route
      array, which always carries it. Returning `undefined`, as the
      tab hooks do, was weighed and not taken: the hooks' callers
      already render nothing for an absent tab, while every caller
      here (and each of #2196's) would need a no-URL branch for a case
      that cannot occur. The guard's line is tested with the site
      config's `apps` emptied.
    - Applied: `urls.ts` and `urls.test.ts` in commit 1 (two cases:
      the route match, and the throw), the call in
      `SubsectionTitleCell.jsx` in commit 2, both commit messages
      reworded. The branch is `4cdccf9c`, `9babca15`, `f749a6a5`;
      lint, the suite (37 suites, 411 passed, 7 skipped; 99.04% of
      lines), `build` and `build:ci` pass at the tip. #2190's live
      body named `getCoursewareUrl` until the edit in entry 17.

16. **`ProfileLink` builds the user's profile URL on its own line,
    under a comment naming openedx/frontend-base#349 (settled with
    Brian 2026-11-11).** Brian asked why Learning rebuilds what the
    shell's `ProfileLinkMenuItem` does.
    - `ProfileLinkMenuItem` is not exported (`shell/index.ts`, in the
      installed `2.0.0-alpha.17` and on `main`); `LinkMenuItem` is, but
      renders a bare `Hyperlink` and passes no props through, so the
      `variant="muted" isInline` of `master`'s links would be lost.
    - The trailing-slash step is needed because the role's URL has two
      forms: `/profile` from the profile app's route, and whatever a
      site writes in `externalRoutes`, which the six dev site configs
      found by code search in the openedx org (frontend-app-account,
      -learner-dashboard, -admin-console, -catalog,
      -instructor-dashboard, and frontend-base's shell) write as
      `http://apps.local.openedx.io:1995/profile/`.
    - The generic problem is #349: the profile page is a route with a
      param (`profile/u/:username`), an external route ignores params,
      so the role sits on `profile` and each caller appends by hand.
      #349's `ProfileLinkMenuItem` bullet already names the case. No
      new issue; nothing added to #349.
    - In the code the URL is a named const above the `return`, so a
      `resolveRouteByRole(role, { username })` can replace that line,
      and the comment above it carries #349's URL.
    - Applied in commit 1. The branch is `75f7ba3b`, `f118985a`,
      `4874b699`; lint, the suite (37 suites, 411 passed, 7 skipped),
      `build` and `build:ci` pass at the tip.

17. **Docs checked against the tip (2026-11-11, at Brian's request,
    after his review of commit 1's code).** Read against the branch at
    `75f7ba3b`, `f118985a`, `4874b699`: this log, `plan-2190.md`, the
    body mirror, effort decisions 34 and 38, `TAG.md`, `UPSTREAM.md`,
    the ticket and the three commit messages.
    - Plan and body mirror: the Test changes section still said
      `course-tabs/hooks.test.tsx` "ports as it is", against What
      moves, which describes its changed first case and the absent-tab
      case; the sentence now points there. Eight phrases named "the
      LMS" and now name the thing: the course metadata response, the
      `LEARNING_MICROFRONTEND_URL` setting, the `jump_to` view, the
      progress serializer, the Django template progress page,
      `master`'s dashboard and profile destinations. The platform repo
      is cited as openedx/openedx-platform, its current name.
    - This log: entries 1, 2, 3 and 10 gain a pointer to the later
      entry that changed what they say (10, 13, 14, 15, 16).
    - Effort decisions 34 and 38 gain an amendment each for entries 16
      and 15.
    - The three commit messages match the code and needed no change.
      `TAG.md` lists every issue named here.
    - Left as found: `UPSTREAM.md` has rows for slug-named body files
      only; the files renamed to their issue number on filing
      (`issue-body-2243.md`, `-2244.md`, `-frontend-base-348.md`, and
      the older `-332.md`, `-333.md`, `-1905.md`) have none. Older
      entries of the effort log and other issues' bodies that say "the
      LMS" were not reworded.
    - #2190's live body was behind the mirror by entries 15, 16 and
      this one. Brian approved the edit; the body was updated from the
      mirror at 2026-11-11T18:46:41Z and read back equal to it.

18. **#2190 goes up as a stack of three layers, bottom layer first
    (settled with Brian 2026-11-11).** The plan had three commits on
    one branch, squashed on merge, and no stack.
    - Each commit becomes a layer with its own PR, off `frontend-base`:
      `bsmith/progress-shared-modules`, `bsmith/progress-tab`,
      `bsmith/progress-entrance-exam`. Squashing one PR would fold the
      entrance exam fix into the port; as its own layer it lands as a
      separate `fix:` commit, which is why it was a separate commit.
      The shared modules hold the design questions of the review pass
      (entries 10 to 16) in 16 files, ahead of the tab's 5,400 lines.
    - The entrance exam layer may be more than one commit (Brian). The
      house rule for a bug-fix layer, failing tests then the fix, is
      decided when that layer is made.
    - Only the bottom layer is created and submitted now, as a draft.
      The other two are added when each is ready, so a stack push
      cannot carry work that is not ready.
    - Costs accepted: the bottom layer renders nothing and has no
      manual pass; the lines waiting on #2196 and #2195 are a larger
      share of its small patch on Codecov; each layer's checks run
      alone.
    - The local branch that held the three commits is kept as
      `bsmith/progress-tab-wip`, the source the upper layers are made
      from.
    - The plan and body mirror are amended first (Layers, Coverage,
      Stack, Manual testing, and which PR states what).

19. **The bottom layer is up as a draft: #2246 (2026-11-11).**
    - `bsmith/progress-shared-modules` was created with `gh stack init
      --base frontend-base` and fast-forwarded to commit 1
      (`75f7ba3b`), then submitted to upstream as a draft. The local
      branch with all three commits is `bsmith/progress-tab-wip`.
    - Checks at the layer alone, before the push: lint passes; 31
      suites, 283 passed, 1 skipped; 97.55% of lines; `build` and
      `build:ci` pass.
    - Found at the layer alone: `getCourseExitMode`'s branches (lines
      42, 46, 58-60, 64, 72 of `course-exit/utils.js`) run in no test
      of this layer. `master`'s `utils.test.ts` has one case; the rest
      is covered through the progress tab's suite, which is the layers
      above. The PR body names them beside `GetCourseExitNavigation`
      (83-116). Codecov's patch on #2246 will list both groups.
    - The PR body (`pr-body-2246.md`) has the Summary, What changed,
      Known gaps and Testing sections. Settled with Brian the same
      day: each layer's PR embeds the decisions that apply to that
      layer. This log covers all three layers and names files and
      branches that do not belong in a public body, so the layer's
      entries are rewritten as `decisions-2246.md` (ten entries, no
      unpushed SHAs, no worktree files) and embedded whole in #2246's
      body, which was read back equal to the file. This log stays the
      working record.
    - #2190's body described one branch and no stack until Brian
      approved the edit: updated from the mirror at 2026-11-11T19:30:33Z and
      read back equal to it, with the three layers and with the
      course exit helper tested in its own layer (entry 20).

20. **The bottom layer tests `getCourseExitMode` and
    `GetCourseExitNavigation` itself (settled with Brian 2026-11-11;
    reverses entry 5 for this layer).** Codecov on #2246: patch 77.38%
    (65 of 84 lines), 19 lines missed, all in `course-exit/utils.js`
    (7 of `getCourseExitMode`, 12 of `GetCourseExitNavigation`); the
    project check also failed, 96.49% to 96.25%, since it fails on
    any drop. Covering only the 7 would leave patch at 85.7% and
    project at 96.36%, both still failing.
    - Brian's read: a patch that low says the layer should carry its
      own tests and not lean on a suite above it. The #2234 rule
      (lines `master` tests through a later suite wait for that port)
      was written when the later suite was another issue; with one
      layer per PR it is the next PR of the same stack, and each PR
      is judged alone.
    - `utils.test.ts`: a table of nine direct cases for
      `getCourseExitMode`, one changed input per case from a baseline
      learner; five cases for `GetCourseExitNavigation` through
      `renderHook`, with the two courseware hooks mocked
      (`jest.mock('@src/courseware/data/apiHooks')`), since at this
      layer they are stubs that return nothing and the function
      throws without metadata. No case for a signed-out user.
    - `GetCourseExitNavigation` loses the `?? {}` after
      `useCoursewareMetadata(...).data`: without metadata the nested
      destructure throws on the next line either way, the pattern
      #2234 dropped from `Timeline`.
    - The table calls the function through
      `getCourseExitMode as (...inputs: unknown[]) => number`.
      `utils.js` is untyped, and TypeScript reads its `= null`
      defaults as null-only parameters, so `build:ci` rejected the
      cases that pass `false` (jest does not type-check; the first
      version shown to Brian had only been through lint and jest).
      JSDoc on the function and a full signature in the cast were
      offered; Brian kept the cast for the test, the real fix being a
      port of `utils.js` to TypeScript, a bigger change than this PR.
    - Amended into the layer's commit and pushed with `gh stack push`
      on Brian's word (2026-11-11): #2246's head is `e1374ac0` (was
      `75f7ba3b`), its commit message names the tests and the dropped
      default, and its body and `decisions-2246.md` (entries 1, 6, 7
      and 9) are updated and read back equal. Checks at the layer:
      lint clean; 31 suites, 297 passed, 1 skipped; 100% of lines;
      `build` and `build:ci` pass.
    - `bsmith/progress-tab-wip` is rebased onto the amended commit:
      `e1374ac0`, `44cdb593`, `8110b077`. Checks at its tip: lint
      passes; 37 suites, 425 passed, 7 skipped; 100% of lines;
      `build` and `build:ci` pass. The mock of the courseware hooks
      in `utils.test.ts` holds once the entrance exam commit makes
      `useCoursewareMetadata` real.

21. **The progress tab layer exists locally (2026-11-11).**
    `gh stack add bsmith/progress-tab` on top of
    `bsmith/progress-shared-modules`, fast-forwarded to `44cdb593`
    from `bsmith/progress-tab-wip`. Not pushed, no PR.
    - Checks at the layer alone: lint passes; 35 suites, 413 passed,
      7 skipped; 100% of lines; `build` and `build:ci` pass.
    - Its patch, estimated from the local lcov the way Codecov counts
      it: 469 lines, none missed, two partial (99.57%).
      `SubsectionTitleCell.jsx` line 36 is the `= 'a'` default
      (openedx/frontend-base#348, entry 8). `CertificateStatus.jsx`
      line 108 has a branch the entrance exam layer's cases take.
    - `bsmith/progress-tab-wip` keeps the entrance exam commit
      (`8110b077`) for the top layer.
    - The four diff-viewer servers are stopped.

22. **The subsection title is a Paragon `Hyperlink` (settled with
    Brian 2026-11-11).** The port kept `master`'s bare `<a>` and chose
    its element by hand: `const { as: SubsectionLink = 'a', ...props }
    = getLinkProps(...)`, since a bare anchor has no `as` prop. The
    `= 'a'` default ran only for an external URL, which
    `getSequenceUrl` never returns, and was the file's one partial
    line (entry 8).
    - Brian asked what the bare anchor bought. Nothing but `master`'s
      exact markup: every other navigating link of the tab is a
      `Hyperlink` on `master` (related links, the outline link, the
      credit help link, the upgrade link), and the other three
      `getLinkProps` call sites of this PR spread it onto one.
    - Now `<Hyperlink variant="muted" className="small"
      {...getLinkProps(getSequenceUrl(courseId, blockKey))}>`. It
      renders `master`'s `muted-link small` classes plus Paragon's
      `pgn__hyperlink standalone-link` and `target="_self"`.
      `pgn__hyperlink` is `display: inline-flex`, so a long title
      that wraps is checked in the manual pass.
    - react-router's `Link` alone was the other candidate (it renders
      the same anchor as `master` and leaves an absolute URL of
      another origin to the browser, read in 6.30.6); not taken, as
      a one-off in a tab of `Hyperlink`s.
    - Amended into the local progress tab layer: `bsmith/progress-tab`
      is `2b8278ba` (was `44cdb593`), unpushed, and its message names
      the `Hyperlink`. `SubsectionTitleCell.jsx` is at 100% of lines
      and branches; the layer's only partial line left is
      `CertificateStatus.jsx` 108. Checks at the layer: lint clean;
      35 suites, 413 passed, 7 skipped; 100% of lines; `build` and
      `build:ci` pass (the import was then put back on one line, with
      lint and the four progress suites rerun). The entrance exam
      commit on `bsmith/progress-tab-wip` is rebased onto it
      (`f12cefd2`), not rechecked. #2190's live body waits for
      Brian's word on the one clause this changes.

23. **`setTabData` completes the subsections a case writes out
    (settled with Brian 2026-11-11).** The port had added
    `problem_scores` to 13 inline subsections of `ProgressTab.test.jsx`
    and `block_key` to five, since `SubsectionTitleCell` requires
    both and a prop-type warning fails the suite. That was 12 of the
    file's 36 hunks against `master`, one or two lines each, and what
    made the diff read as huge to Brian.
    - The helper now gives every subsection of the built tab data a
      `block_key` and an empty `problem_scores` unless the case wrote
      its own, and the inline fixtures are `master`'s again.
    - The removed values matched each fixture's points
      (`[{ earned: 8, possible: 10 }]`); the default is an empty list.
      No case asserted on those drawer rows.
    - Doing it in the factory, with a hook over every subsection, was
      the other candidate: it would also drop the two lines added to
      the factory's second subsection, but it hides defaults in a
      factory other suites share, in a file Brian had just accepted.
    - Amended into the local progress tab layer, now `1bc0a98b`
      (was `2b8278ba`), unpushed. The file's diff against `master` went
      from 36 hunks to 24. Checks at the layer: lint clean; 35 suites,
      413 passed, 7 skipped; 100% of lines; `build` and `build:ci`
      pass. The entrance exam commit on `bsmith/progress-tab-wip` is
      rebased onto it, not rechecked.

24. **A case about a click handler stops the navigation; where a link
    goes is its own case (settled with Brian 2026-11-11).** With the
    in-page links as route links and the test rendering the real route
    array, clicking the dates, outline or subsection link in `master`'s
    four "sends event on click" cases navigated, and each case ended
    mid-navigation: React's act warning, which fails the suite. The
    port had made the cases wait for the navigation and assert the new
    path (the dates one also mocked the dates request and waited for
    its heading). Brian: hacky, the cases are for the track events.
    - The four cases have `master`'s bodies again plus
      `preventNavigation(link)` before the click: it cancels the
      click's default action, which react-router's `Link` respects,
      and the `onClick` that sends the event still runs. The helper's
      comment now covers route links as well as anchors that leave
      the site.
    - Where a link goes is asserted in the "Related links and
      subsection titles" group: the existing case for the dates and
      outline hrefs, a new case for the subsection title's href, and
      one new case that follows the dates link and lands on the dates
      tab without leaving the site.
    - Amended into the local progress tab layer, now `24768643` (was
      `1bc0a98b`), unpushed. Checks at the layer: lint clean; 35 suites,
      415 passed, 7 skipped; 100% of lines; `build` and `build:ci`
      pass. The entrance exam commit on `bsmith/progress-tab-wip` is
      rebased onto it, not rechecked.

25. **What each new case of `ProgressTab.test.jsx` is the only test
    of (measured 2026-11-11, at `24768643`; Brian asked whether
    `master` really has no equivalents).**
    - `master`'s progress tab has two test files, `ProgressTab.test.jsx`
      (68 cases) and `hooks.test.jsx`. None of its cases asserts what
      a new case asserts: it has no assertion on the Studio link, the
      completion chart's text, any link's `href`, the grade bar's
      label anchors or `CREDIT_HELP_LINK_URL`. Its own coverage (the
      legacy tree's lcov of 2026-10-29) leaves 24 lines and about 45
      branch lines of the tab's files unrun.
    - Method: the nine suites that load the tab's code (the four in
      `progress-tab/`, `routes.test.tsx`, `shared/`, `courseware/`)
      were run 33 times with coverage, each time with one new case
      left out by `-t` with a negative lookahead, and each lcov
      compared with the full run's. Eleven runs made three at a time
      had 5-second timeouts under the load (the right-to-left cases,
      the first page-rule case, a `routes.test.tsx` case); rerun
      alone they pass, and the alone runs are the ones compared.
    - 20 cases are the only test of some line or branch: the Studio
      link for an administrator; the chart's popovers, all-complete,
      none-complete and thin locked segment; the dates link opening
      the dates tab; practice scores; the eligibility and requirement
      statuses; the four grade summary cases; the tooltip closing on
      blur; four of the five certificate cases; both right-to-left
      cases.
    - 13 lose no line and no branch when left out. Four assert what
      this PR introduces: the page rules (two tests), the dates and
      outline hrefs, the subsection href, and the credit help link
      read from the app config. Nine assert `master` behaviour that
      `master` never asserted and other cases already run: no Studio
      link for an administrator without a URL and for a learner; the
      completion text for screen readers; no dates link and no
      outline links without the tab; a title without a link when its
      `url` is withheld; the two grade bar anchor cases; the
      availability date in the browser time zone. Those nine are 87
      of the block's 433 lines.
    - In a normal run the slow cases take 0.5 s (right-to-left) and
      0.3 s (first page rule); the 5-second timeouts only appeared
      with three suites running at once.

26. **The progress tab layer is two commits: the port, then tests for
    `master`'s gaps; nine cases are dropped (settled with Brian
    2026-11-11).** Follows entry 25.
    - Brian's correction to entry 25's framing: "the only test of some
      line or branch" and "what this PR introduces" are separate
      axes. Of the 33 new cases: this PR's behaviour, 1 that is the
      only test of some code and 4 that add no coverage; `master`'s
      behaviour that `master` never tested, 19 that are the only test
      of some code and 9 that add no coverage.
    - Without the 19 the package is still at 98.31% of lines, but the
      layer's patch, counted as Codecov counts it, is about 90% (21
      lines missed and 24 partial of 468).
    - Brian: tests of `master`'s behaviour belong in a separate layer
      or at least a separate commit; a separate commit, since they
      are about the tab this layer adds. The nine that add no
      coverage are dropped: no Studio link for an administrator
      without a URL or for a learner, the completion text for screen
      readers, no dates link and no outline links without the tab, a
      title without a link when its `url` is withheld, the two grade
      bar anchor cases, the availability date in the browser time
      zone.
    - Commit 1, the port (`b41384b1`): as before, with `master`'s
      cases adapted, the five cases about its own changes (page
      rules, the dates and outline hrefs, the subsection href, the
      dates link opening the dates tab, the credit help link from app
      config) and, in `ProgressTabComponents.test.tsx`, the four
      default-parameter cases. Checked alone: lint clean; 34 suites,
      368 passed, 7 skipped; 98.31% of lines; `build:ci` passes.
    - Commit 2, tests only (`6a8edf78`, `test:`): the 19 cases, the
      right-to-left locale mock they need, `utils.test.ts`, and the
      dividers and no-metadata cases of the components test. At the
      layer's head: lint clean; 35 suites, 406 passed, 7 skipped;
      100% of lines; `build` and `build:ci` pass.
    - This layer is the second exception to "a layer is one commit"
      (the entrance exam layer may also be more than one). Both are
      squashed on merge.
    - Unpushed. The entrance exam commit on `bsmith/progress-tab-wip`
      is rebased onto the new head (`47740618`), not rechecked.

27. **#2190's body updated (2026-11-11).** On Brian's word, from the
    mirror at 2026-11-11T22:23:46Z, read back equal to it. It now carries entries 22
    (the `Hyperlink`), 23 (`setTabData`), 24 (event cases stop the
    navigation) and 26 (the layer's two commits and the tests'
    two kinds).

28. **README wording restored; what each case of
    `ProgressTabComponents.test.tsx` is the only test of
    (2026-11-11).**
    - The progress README keeps `master`'s "as in the example below"
      (Brian): the example's place is held by the line pointing at
      #2185, so the phrase is not wrong. Folded into the port commit;
      the layer is now `b5965481` and `36928e7e`, unpushed, and the
      entrance exam commit on `bsmith/progress-tab-wip` is rebased
      onto it. A README-only change; checks not rerun.
    - Measured as in entry 25, one case left out per run, at the
      layer's head. The four default-parameter cases are each the
      only test of their default (`PassingGradeTooltip.jsx` line 8,
      `CurrentGradeTooltip.jsx` 10, `GradeRangeTooltip.jsx` 13,
      `AssignmentTypeCell.jsx` 9): every caller in the tab passes
      those props. "A divider at each end" is the only test of a
      branch at `CompleteDonutSegment.jsx` line 69; the other two
      divider cases lose nothing when left out. `CertificateStatus`
      without course metadata is the only test of the branches at
      `CertificateStatus.jsx` lines 29 (`?? {}`) and 69 (no time
      zone).
    - Put to Brian: drop the two divider cases that add nothing; for
      the four defaults, keep them with their cases (entry 6) or drop
      the defaults and require the props, which removes the cases at
      the cost of an interface change from `master`. Open.

29. **`ProgressTabComponents.test.tsx` is whole in the coverage commit
    (settled with Brian 2026-11-11; amends entry 26).** All eight of
    its cases stay, the two divider cases that add nothing included.
    Brian: none of the file is part of the port, the default-parameter
    cases too; they belong in the commit that adds coverage. That
    commit is therefore "tests that add coverage", most of them for
    code `master`'s suite leaves unrun, and the four for defaults the
    port rewrote from `defaultProps`.
    - The layer is `8d2af02d` (the port) and `06f6514c` (the tests),
      unpushed; the head's tree is unchanged, and both messages are
      reworded. The port commit alone: lint clean; 33 suites, 364
      passed, 7 skipped; 98.31% of lines; `build:ci` passes. The
      entrance exam commit on `bsmith/progress-tab-wip` is rebased
      onto it, not rechecked.
    - #2190's body is one sentence behind the mirror on this.

30. **The four components get no defaults at all, and their four
    cases go (settled with Brian 2026-11-11; replaces entry 6's first
    bullet).** Brian found `expect(popover).not.toHaveClass('undefined')`
    an odd pattern.
    - It asserted the absence of a symptom: `PassingGradeTooltip` and
      `GradeRangeTooltip` write the class name into a template string,
      so without the default the element gets a class named
      `undefined`.
    - Checked by removing all four defaults and running the file: the
      `PassingGradeTooltip` and `GradeRangeTooltip` cases fail
      (`… bg-primary-500 undefined …`, `… mb-0 mt-n1 undefined`); the
      `CurrentGradeTooltip` and `AssignmentTypeCell` cases still pass.
      `CurrentGradeTooltip` hands `className={tooltipClassName}`
      straight on, and `AssignmentTypeCell` only tests `footnoteId`
      and `locked` for truthiness, so those defaults did nothing and
      their cases could not fail.
    - Now: `CurrentGradeTooltip` and `AssignmentTypeCell` have
      `master`'s signatures with the `defaultProps` block gone;
      `PassingGradeTooltip` and `GradeRangeTooltip` drop the default
      and build the class list with `classNames` (already a
      dependency, used in three files of the package), which skips an
      absent value. The rendered classes are `master`'s. The four
      cases leave `ProgressTabComponents.test.tsx`, which keeps the
      three divider cases and `CertificateStatus` without metadata.
    - Keeping the defaults and only fixing the tests was the
      alternative, not taken.
    - Applied: the component edits in the port commit, the four cases
      out of the coverage commit, both messages reworded. The layer is
      `714af67d` (the port) and `8d8d8123` (the tests), unpushed. The
      port alone: lint clean; 33 suites, 364 passed, 7 skipped; 98.31%
      of lines; `build:ci` passes. At the head: lint clean; 35 suites,
      402 passed, 7 skipped; 100% of lines, and the four components at
      100% of branches; `build` and `build:ci` pass. The entrance exam
      commit on `bsmith/progress-tab-wip` is rebased onto it, not
      rechecked. #2190's body is behind the mirror on this and on
      entry 29.

31. **`LockedDonutSegment` drops `viewBox` from the lock icon's `<g>`
    (confirmed with Brian 2026-11-11).** `master` has `<g width="6"
    height="21" viewBox="0 0 21 6">` since the file's first commit
    (`aca45fb2`, 2021-04-13, #407, the completion chart); five later
    commits left the element alone and #407's three review comments on
    the file do not mention it. With `master`'s line put back the
    package's lint fails: `Invalid property 'viewBox' found on tag
    'g', but it is only allowed on: marker, pattern, svg, symbol,
    view` (`react/no-unknown-property`). A browser ignores the
    attribute on a `<g>`, so nothing should change on screen; the
    lock icon is looked at in the manual pass. `.jsx` is linted
    locally only until openedx/frontend-base#327, so CI would pass
    with the line in today.

32. **History of the two `trigger="hover"` lines (read 2026-11-11,
    Brian asked whether hover-only had a reason).** The port writes
    `trigger={['hover', 'focus']}` in `GradeSummaryHeader.jsx` and
    `GradeSummaryTableFooter.jsx`, to stop react-bootstrap's warning
    about a hover-only trigger; with `master`'s value back, nine
    grade summary cases fail on it.
    - `['hover', 'focus']` is the default of Paragon's
      `OverlayTrigger` (`src/Overlay/index.tsx`) and of
      react-bootstrap 1.6.8's underneath, so dropping the prop gives
      the same behaviour as the port's line.
    - Both lines came in with #1558 (`1ffc93dc`, 2025-01-06,
      KristinAoki, "update grade summary to show floating point
      grades"), the only commit in the repo's history that adds the
      text; #1619 only re-indented the header's. Before #1558 the
      header had `trigger="click"` on an `IconButton` with a
      `Popover`, a `show` state toggled on click and closed on blur,
      and `disabled` when grades are fully locked; #1558 replaced it
      with a hover `Tooltip` on a bare `Icon`, and added the footer's
      tooltip in the same shape.
    - No reason for hover-only is recorded: #1558's description says
      a tooltip was added and its test steps say "Hover over the
      tooltip in the table footer"; it has one approval and no review
      comments.
    - A bare `Icon` cannot take keyboard focus, so with or without
      `focus` in the trigger the tooltips open on hover only.
