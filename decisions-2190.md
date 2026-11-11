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

2. **The shared-modules commit (2026-11-10).** Made while porting:
   - `utils.test.ts` gets the `logClick` and `logVisit` cases and no
     `GetCourseExitNavigation` case (entry 1). Its lines are the
     package's only uncovered ones after this commit: the
     `course-exit` directory is at 54.76% of lines, the package at
     97.53 against the 96.15 bar.
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
     messages are untouched.
   - `getCourseExitMode`'s two `indexOf` comparisons become `includes`,
     the autofix for `@typescript-eslint/prefer-includes`.
   - `links.test` is `links.test.tsx`, not the plan's `.jsx`: a new file
     is TypeScript.
   - The profile link drops one trailing slash from the role's URL
     before appending `/u/<username>`, as `ProfileLinkMenuItem` does
     (`shell/menus/ProfileLinkMenuItem.tsx` in openedx/frontend-base,
     read in the installed `2.0.0-alpha.17`).
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
