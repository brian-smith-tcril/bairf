# Decisions — the courseware and course-end pages before the learning-sequences outline has loaded (#2138)

A layer below #2089's layer A, on `master`, branch `bsmith/outline-pending-fixes`: PR
#2139 in stack #2141, with #2089's layer A (PR #2140) above it. Two commits: the failing
tests, then the fix (the layer lands as a squash); the PR went up as a draft with the
test commit alone, so CI shows the cases failing before the fix makes them pass. Entries 2
and 3 were tentative until the fix commit was reviewed (2026-09-30), which confirmed them.

1. **Tests first, asserting what the learner sees.** Each case holds the outline request
   on a promise that never resolves (the manual repro's delayed outline) and waits for
   both metadata queries by their query state rather than for the spinner, so it does not
   assume whether a page waits for the outline or renders without it — except the
   navigation case, which states entry 2's choice. None releases the outline: what the page
   shows once it has loaded is the existing tests' (or, for the slot, its baseline case's).
   Seven cases fail on `master` (the six below and entry 9's outline-failure redirect), each
   checked for the observed reason; the rest pass there. The test commit's message counts
   six, omitting the redirect case; it is not rewritten, since the commit's CI run is the
   record of the cases failing.
   After the query state settles, each case flushes with `act` around `setTimeout(0)`
   before asserting: TanStack Query 5.102.8's `notifyManager` delivers observer
   notifications on `systemSetTimeoutZero`, so the components re-render one macrotask
   after the cache's status changes, and an assertion made before then would pass without
   the page having rendered.
   - **`CourseBreadcrumbsSlot/index.test.tsx`** (new): the default `CourseBreadcrumbs`
     inserted as the slot's README shows, through the real FPF (`jest.unmock`, since
     `setupTest.js` mocks it for every suite), so the plugin's own error boundary contains
     a failure as it does for an operator. *renders inserted breadcrumbs* (a baseline with
     the outline loaded; passes on `master`) comes first, then *inserted breadcrumbs do not
     error while the outline is loading* (fails on `master`: `CourseBreadcrumbs` throws in
     `useModels`). The slot is the home rather than `CourseBreadcrumbs.test`, since the
     component can be placed anywhere and the slot is where the README inserts it; a first
     version in `CoursewareContainer.test` mocked the slot to render the component in its
     place, which bypassed FPF and its boundary. The slot renders behind a test gate that
     waits, as the courseware page does, for both metadata queries, and by default for the
     outline too (`waitForOutline`, off in the loading case): rendered bare it threw on its
     first render, before any query had resolved, so a failure would not have been the
     outline's. The gate reads the queries through their own hooks with `{ enabled: false }`
     — a first version observed them by key alone through `useQueries`, whose options then
     replaced the query's `meta`, so the bridge wrote nothing and the store stayed empty.
     The plugin config carries a `priority`, which FPF requires of an inserted widget
     (`requiredPluginTypes`).
   - **`CoursewareContainer.test`**, *while the learning-sequences outline is pending*:
     *disables the Next control* (fails on `master`: the control is an enabled link to the
     current unit, since its `to` is `undefined`) and *does not show a page title with an
     empty segment* (fails: "| Demonstration Course | edX"). The suite mocks `Unit`, which is
     what renders the unit navigation in the app, so the navigation case sets
     `mockRenderUnitNav` and checks the Link form of Next that the mock renders — the same
     `useSequenceNavigationMetadata` data as the top arrows clicked in the manual repro.
   - **`CourseExit.test`**, *when the outline is loading*: *does not redirect* and *does not
     render any course-end content*, run for three learners who are not passing, each of
     whom gets a different wrong outcome on `master` (settled in review over cases named for
     an "in-progress learner": being in progress is what the page can only conclude from the
     outline, so it cannot describe the learner before it loads, and over a table-driven
     `it.each` that was hard to read). An audit learner (`audit_notpassing`) who cannot view
     a certificate is redirected; one who can is shown `CourseNonPassing`; a learner with no
     certificate data who cannot view one is shown `CourseCelebration` (the `true` defaults
     of `isCelebratoryStatus` / `isEligibleForCertificate` when `certificate_data` is
     `null`). Each of those pages also sends `edx.ui.lms.course_exit.visited` on mount with
     its variant, so a wrong page records a wrong visit too (from the code; not observed).
     The cases render `CourseExit` at `/course/:courseId/course-end` with a stub page at
     `/course/:courseId`, so a redirect shows in the URL, and check the three pages' headings
     through `messages` (`congratulationsHeader`, `endOfCourseHeader`,
     `courseInProgressHeader`) rather than literal strings, so a reworded heading cannot
     make the negative checks pass by default.

2. **The unit navigation renders while the outline is pending, disabled until it can
   navigate.** Before the React Query conversions nothing below `TabPage`
   rendered until the outline had loaded: `TabPage` showed its spinner until the slice's
   `courseStatus` was `LOADED`, which `fetchCourse` set only once the outline had been
   fetched, and `useSequenceNavigationMetadata`'s no-link defaults could only be hit
   while the sequence was loading, under `Sequence`'s own spinner. Since #2074 the page
   renders before the outline lands, and the buttons are shown enabled with no link, so
   they look usable and do nothing. Of the ways to handle that window, a shown-but-dead
   control is the observed bug, controls that pop in once the outline lands and a spinner
   in their place were both judged worse than controls that are present and disabled from
   the first render. That the control navigates once the outline has loaded is the
   existing cases' (*saves the position on each unit change*, and others that click Next).

3. **`disabled` is derived from the link**: `disabled = !nextLink ||
   (isLastUnit && !exitActive)` in `UnitNavigation` and `SequenceNavigation`, and
   `disabled = isFirstUnit || !previousLink` in `PreviousButton`. Once the course and
   sequence have loaded, `nextLink` is always set (the next unit, the next sequence's
   first unit, or `/course/{courseId}/course-end` on the last unit) and `previousLink` is
   missing only on the course's first unit, where Previous is already disabled; the
   entrance-exam early return (`isFirstUnit` and `isLastUnit` both `true`, no links)
   already disables both. So a missing link means only "not loaded yet", and "no link"
   is exactly "cannot navigate", with no second signal to keep in step. The alternative,
   an explicit flag from the hook (for example `isNavigationLoaded`), reads more directly
   at the call site but adds a field that must agree with the links. The top-arrow slot's
   `disabled` plugin prop is computed in `UnitNavigation` before it is passed on, so it
   follows either way.

4. **`Course` sets the page title only once the outline has loaded; until then
   `LoadedTabPage`'s title stands.** Three things set the title: `public/index.html`'s
   static "Course | {SITE_NAME}", filled at build time, before React renders;
   `LoadedTabPage`'s `<Helmet>`, "{active tab} | {course} | {SITE_NAME}" from the
   course-home metadata — the title every course-home tab shows — once `TabPage` renders
   its children; and `Course`'s `<Helmet>`, "{sequence} | {section} | {course} |
   {SITE_NAME}", which `react-helmet` lets override `LoadedTabPage`'s since it is nested
   inside it. `Course` renders in the same pass as `LoadedTabPage`, so its title took over
   at once, and with the outline pending it was the partial "| Open edX Demo Course | My
   Open edX" (observed; the leading "|" is the section read as `{}` with no title).
   Rendering `Course`'s `<Helmet>` only once the outline query has succeeded — the source
   of the sequence and, through the store, the section — leaves
   `LoadedTabPage`'s "Course | Open edX Demo Course | My Open edX" in that window, then
   the full courseware title: the component sets the title once, each state is complete,
   the interim title is one the app already uses, and its course name is the course-home
   metadata's `title` — unescaped (#2137) and loaded before `TabPage` renders anything.
   Weighed and not taken: leaving the unknown segments out of `Course`'s title (a title
   the component would update twice, and after #2089's layer A, which reads the course
   name from the outline, just "{SITE_NAME}"). The title case needs no change: the interim
   title has no empty segment.

5. **While the outline is pending, the breadcrumbs show their existing not-loaded state:
   "Course", then the section and sequence items empty, filling in once it lands.**
   `CourseBreadcrumbs` already renders that state whenever it does not have its data: its
   `links` are always `[chapters, sequentials]`, empty until `isCourseLoaded &&
   sequenceQuery.isSuccess`, and each `BreadcrumbItem` falls back to an empty label, so
   the breadcrumbs read "Course / / ". It shows today on every move into a different
   sequence, while that sequence's query is pending (`Course` renders the breadcrumbs
   outside `Sequence`'s spinner). The outline window reuses it rather than inventing a
   pattern for one case. Simulated first with an `env.config.jsx` plugin that held the real
   breadcrumbs back 8 s: an empty slot pops the content below it down when they appear, and
   the home link alone did not read as breadcrumbs; a "Course / … / …" placeholder was
   weighed and not taken, since the app has no such pattern and the sequence-loading
   window already uses the empty items. The three slots keep the same height in every
   state. So the fix is only that the not-loaded state no longer throws:
   `useModels('sections', course.sectionIds ?? [])`, since `sectionIds` reaches the store
   only from the outline's write; #2089's layer A rewrites that read. Before the RQ work
   (`57a2f02b~1`, before #2023) the call was `useModels('sections', course.sectionIds)`
   with no fallback, and `useModels` runs `ids.map`, so the breadcrumbs could not have
   survived a missing `sectionIds` either — they never met one: `sectionIds` came only
   from `normalizeLearningSequencesData` (the outline), merged into the course model by
   `fetchCourse`'s `updateModelsMap`, `normalizeMetadata` had none, and `Course` rendered
   only after `fetchCourseSuccess`, which required the outline. So the `?? []` guards a
   state new since #2074 and #2023, not a restored one; what it renders is the existing
   one, since the `links` memo builds nothing until the course and sequence are loaded.
   Precedent for the default: the thunk-era `selectors.js` read
   `const { sectionIds = [] } = state.models.coursewareMeta[...]`.

6. **The course-end page waits for the outline through `TabPage`, whose `CourseStatus`
   takes a list of tab-data queries.** The page's mode cannot be right without the
   outline: `getCourseExitMode` decides from, in order, the entrance exam (not passed by
   `CourseExitContent`, so `null`), the exit page being active and the learner signed in
   and enrolled, the certificate status, then `hasScheduledContent && !userHasPassingGrade`
   → `inProgress`, `isEligibleForCertificate && !userHasPassingGrade &&
   canImmediatelyViewCertificate` → `nonPassing`, a celebratory status → `celebration`,
   and otherwise `disabled`; while the outline is pending the `inProgress` branch is
   skipped, and `CourseExitContent` renders `<Navigate to={/course/${courseId}}>` for
   `disabled` — one-way, so the outline landing later cannot bring the learner back. So
   `CourseExit` gives `TabPage` the courseware metadata and the outline as its tab data,
   as the route's status did before #2023.

   `CourseStatus` gains `tabDataQueries`, a list, beside the optional `tabDataQuery`, and
   its type makes the two mutually exclusive (a union in which each side sets the other
   to `never`; most callers are `.jsx`, so for them that documents rather than
   enforces). `TabPage` reads only `isPending`, `isError` and `error` from them;
   `deriveView` defaults `tabDataQueries` to `tabDataQuery ? [tabDataQuery] : []` in its
   destructure of `courseStatus` and treats the tab as loading while any is pending and
   as failed if any has failed. The five callers with one query keep `tabDataQuery`
   unchanged, `DiscussionTab` still passes none, and `CourseExit` passes
   `tabDataQueries`. The contract stays generic — `metadataQuery` the access authority,
   the tab data the tab's content, with the combining rules once, in `deriveView` — which
   is what #2073 held to when it rejected an optional `outlineQuery` slot on
   `CourseStatus` as courseware routing policy belonging to its container. That
   rejection also rested on outline-pending needing no handling because children
   tolerate a not-yet-loaded outline, the assumption this layer corrects; here the
   outline is not a slot of its own but part of one page's tab data. Weighed and not
   taken: the outline beside the one `tabDataQuery` as a special-cased field (#2073's
   rejected shape, making the tab contract a special case for one page); a hand-built
   query-shaped object combining the two at `CourseExit` (TanStack's `useQueries`
   `combine` needs each query's options object, and these two exist only as hooks);
   replacing `tabDataQuery` with the list for every caller (five of the seven have one
   query, so each would wrap it in brackets); and one prop typed as a query or a list of
   queries (a singular name holding a list, or a rename for every caller).

   User-facing: `TabPage` keeps the header and footer and shows `PageLoading` in place of
   `LoadedTabPage` until both have loaded, the view every tab shows on a hard load (the
   course tabs are full page loads); arriving through Next shows no spinner, since both
   metadata queries and the outline are cached from the courseware page (and, with entry
   2, Next cannot be clicked before the outline has loaded); a refetch never returns a
   loaded page to the spinner, since `isPending` is true only until a query first has
   data. The recommendations (`useCourseRecommendations`) are not fetched by the
   courseware page and still load inside their component. An outline failure is not
   `TabPage`'s to show: entry 9 restores the redirect to the course home.

7. **`TabPage` shows every failed tab-data query's error detail, one paragraph each.**
   With more than one tab-data query, keeping only the first failure's detail could hide a
   learner-facing explanation behind a failure without one. `getErrorDetail` returns the
   backend's `detail` only for a 403 (learner-facing prose) and `undefined` otherwise, so
   `deriveView` collects the details of every failed query, de-duplicated, into
   `errorDetails`, and `renderError` renders each as its own paragraph, or the generic
   failure message when there are none; the course-home metadata's error path yields a
   one-item list. Diagnosis was never at stake: the app `QueryCache`'s `onError` logs every
   failed query on its own, at `error` unless the query's `logStatusAs` says otherwise,
   before `TabPage` sees it. The paragraphs keep the error view's existing look — the
   centered 30em paragraph between the header and footer slots, from #61; the 403 detail
   in it from #2073. The classes and width move from the `<p>` to a wrapping `<div>`, and
   each `<p>` keeps Bootstrap's default 1rem bottom margin, now inside the div's `py-5`
   padding instead of outside it, so one detail, or none, spaces as on master and the
   same margin separates several. Each is keyed by its text: the details are
   de-duplicated and the fallback is a single string, so the text is unique in the list
   (airbnb's `react/no-array-index-key` rules out the index). Seen in a manual
   simulation (the outline and courseware metadata requests throwing 403s with different
   details, on the course-end page, before entry 9 restored the outline-failure
   redirect): two stacked centered paragraphs.

   No caller can show more than one detail today: on course-end, the one
   `tabDataQueries` caller, an outline failure with access redirects before `TabPage`
   renders (entry 9) and without access `TabPage`'s denied path wins, so the error view
   there only ever carries the courseware metadata's detail. Kept anyway: the list
   exists for the loading wait (entry 6), a list of queries can fail more than once, and
   showing one failure while dropping the rest would be the surprising behaviour for
   whichever page first passes two that can both fail.

   "Every" is every failed *tab-data* query, never the metadata query's detail beside
   them. The metadata query is not a peer error source but the gate in front of the tab
   data: since #1987 `deriveView` resolves the metadata phase (error → failed, pending →
   loading, `!hasAccess` → denied) before it reads the tab data at all, mirroring the
   `fetchTab` thunk, which denied "regardless of the tabDataResult" — #1987 rejected a
   combined `metadataQuery.isError || tabDataQuery.isError` because a tab-data failure
   while metadata says `hasAccess: false` must deny, not fail. On a metadata error the
   tab-data queries may still be pending, or failing only for want of access, which the
   failed metadata can no longer tell; so that path shows the metadata's detail alone.
   Once access is settled, the tab-data queries are peers in one phase (on course-end,
   the courseware metadata and the outline, neither failure explaining the other), so
   all their details show. This keeps #2073's precedence — metadata's detail
   first, then tab data's — widening only its second step from one query to several.

8. **The fix commit's tests.** The seven cases from entry 1 pass. One existing case changes
   with entry 2: `UnitNavigation.test`'s *renders correctly without units* rendered the
   navigation with no sequence and no unit and asserted two links — both links to the
   current page, the shown-but-dead state — and now asserts that exactly the Previous and
   Next controls render, as disabled buttons. `TabPage.test` gains a *with several
   tab-data queries* block: *renders the Loaded Tab Page when every tab-data query
   resolves*, *displays loading while any tab-data query is loading*, *displays the 403
   detail of every failed tab-data query* and *displays a detail shared by several failed
   tab-data queries once*. Negative check, run: with only the first failed query's detail
   kept, exactly the every-detail case fails.

9. **The course-end page redirects to the course home on an outline failure with
   access, as it did before #2023.** Found while simulating entry 7: the courseware page
   sent the simulated outline 403 to the course home, the course-end page showed
   `TabPage`'s error view. In the thunk era both did the same (checked against
   `57a2f02b~1`): the course-end route rendered `CourseExit` inside `<TabContainer
   tab="courseware" fetch={fetchCourse} slice="courseware">`, `fetchCourse` dispatched
   `fetchCourseDenied` when both metadata requests succeeded but the outline failed,
   even with `hasAccess: true`, and `TabPage`'s denied path took
   `getAccessDeniedRedirectUrl`'s `default` branch (no `errorCode`, `activeTabSlug` not
   `outline`) to `/course/{courseId}/home`. The courseware page kept it: #2074 moved it
   into `outlineFailureRedirect` unchanged. The course-end page lost it in #2023, whose
   `useCourseExitStatusBridge` derived its status from the two metadata queries alone,
   the same change that lost the outline wait (entry 6); on `master` a failed outline
   leaves `hasScheduledContent` `undefined` as a pending one does, permanently. So
   `CourseExit`, before rendering `TabWithTimer`, renders `<Navigate
   to={/course/${courseId}/home} replace>` when `outlineQuery.isError` and the
   course-home metadata says `hasAccess` — `outlineFailureRedirect`'s condition. In the
   page, not `TabPage`: as #2073 held, outline routing policy belongs to the component
   that owns it, and `TabPage`'s contract stays generic. Without access nothing changes:
   `TabPage` checks denied before tab-data errors, so the denied redirect by `errorCode`
   applies, as `denied` did in the thunk era. While the course-home metadata is pending
   `hasAccess` is `undefined`, so `TabPage` shows loading and the redirect follows once it
   resolves. Test, in the test commit: `CourseExit.test`'s *when the outline fails*
   *redirects to the course home*, the outline replying 500 (a failure with access, not
   an access error) and a stub `/course/:courseId/home` route; it fails before the fix
   (the page stays on `/course-end`). Also recorded on #2138 as item 6.

**Found along the way, not this layer's**

- In their not-loaded state the breadcrumbs' two empty items are still links, to
  `/course/{courseId}/{courseId}`: with no sequences `BreadcrumbItem`'s `baseUrl` falls
  back to `defaultContent.id`, which its fallback sets to the course id.
- The `CourseBreadcrumbsSlot` README's insert example has no `priority`, so FPF logs "the
  insert operation config is invalid for widget id: default_breadcrumbs_component" for it
  (and renders it anyway).
- `CoursewareContainer.test`'s *should render the sequence_navigation plugin slot
  correctly* asserts only `MockedPluginSlot`'s `data-testid`, so it tests the mock rather
  than the slot.
