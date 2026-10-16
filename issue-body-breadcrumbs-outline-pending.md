Part of #1946 — Redux → React Query migration (Stage 1). Found while planning #2089.

**Goal:** decide what the courseware and course-end pages promise their children about the learning-sequences outline, and fix what breaks when those pages render before it has loaded.

**Cause.** Until the React Query conversions, neither page rendered its children before the outline had loaded: the thunk era's `fetchCourse` dispatched `fetchCourseSuccess` only once the outline had been fetched, and the course-end route waited on `fetchCourse` too. Now both gate `TabPage` on the course-home metadata and the courseware metadata alone:

- the course-end page since #2023, whose `CourseExit` got the two-query status "(2 queries, no outline)";
- the courseware page since #2074, on the reasoning that "everything under `Course` tolerates a not-yet-loaded outline (`useSequenceIds` → `[]`, nav defaults, `Sequence`'s spinner rides the independent sequence query)" (between #2023 and #2074 its transitional `useCourseStatusBridge` still required `outlineSuccess`).

So whenever the outline lands after both metadata queries, the children render without it. Not every reader copes.

**Observed** (tutor local, `master` at `76fa1f06`, 2026-09-29), with a temporary 8 s delay at the top of `getLearningSequencesOutline`; in the network tab the outline request landed after 10 s and everything else within 5 s:

1. **`CourseBreadcrumbs` throws.** With `env.config.jsx` inserting the default `CourseBreadcrumbs` into `org.openedx.frontend.learning.course_breadcrumbs.v1` (the slot README's example), a hard reload of a full unit URL shows "An unexpected error occurred. Please click the button below to refresh the page." in the breadcrumbs region, with `TypeError: Cannot read properties of undefined (reading 'map')` in `useModels` (`src/generic/model-store/hooks.js`), called from `CourseBreadcrumbs.jsx`; the rest of the page renders. Without the delay the breadcrumbs render normally.
   - `CourseBreadcrumbs` reads `useModels('sections', course.sectionIds)` with `course = useModel('coursewareMeta', courseId)`; `sectionIds` reaches that store entry only from the outline query's write, and `useModels` maps `ids` unguarded.
   - It stays in the slot because FPF wraps each inserted plugin in frontend-platform's `ErrorBoundary` (`PluginContainer.jsx`), whose default fallback is `ErrorPage`, and which logs the error through `logError`; from the code, the boundary never resets, so the region stays on the error until a reload.
   - The slot has no default content, so a stock install renders nothing there; only instances that insert `CourseBreadcrumbs` are affected. The breadcrumb suite renders on `initializeTestStore`'s seeded store, where `sectionIds` is present before render.
2. **The course-end page shows the wrong mode, or redirects away.** `CourseExitContent` passes the outline's `hasScheduledContent` to `getCourseExitMode`; while the outline is pending it is `undefined`, which skips the `inProgress` branch. With the responses pinned in the normalizers to an in-progress audit learner (`hasScheduledContent: true`, `courseExitPageIsActive: true`, `userHasPassingGrade: false`, `certificateData: { certStatus: 'audit_notpassing' }`):
   - without the delay, a hard reload of `/course/{courseId}/course-end` and the last unit's Next both show `CourseInProgress` ("More content is coming soon!");
   - with it and `canViewCertificate: false`, a hard reload redirects to `/course/{courseId}` before the outline lands (`getCourseExitMode` returns `disabled`, and `CourseExitContent` renders `<Navigate>`), where the breadcrumbs plugin then throws as in 1; once the outline lands the resume redirect moves on to a unit. The learner never sees the in-progress page;
   - with it and `canViewCertificate: true`, a hard reload shows `CourseNonPassing` ("You’ve reached the end of the course!") while the outline is pending (`nonPassing`), then `CourseInProgress` once it lands;
   - reaching the page through the last unit's Next once the outline has loaded shows `CourseInProgress`: the outline is already cached, so the page has it on first render.
3. **The unit navigation arrows do nothing.** The top previous/next arrows render and can be clicked while the outline is pending, but do not navigate: `useSequenceNavigationMetadata` returns no `nextLink` / `previousLink` until `useIsCourseLoaded`, which includes the outline, and the buttons call `navigate` with that `undefined` link.
4. **The page title passes through a partial state.** The tab shows `public/index.html`'s static "Course | edX"; then, once `Course` renders with the outline pending, "| Open edX Demo Course | My Open edX" — `Course.jsx`'s title breadcrumbs drop the outline's sequence (`undefined`), keep the section as `{}` from `useModel('sections', …)` with no `title` (the leading "|"), and take the course segment from the metadata's `name` (HTML-escaped by the endpoint, #2137; not visible here since the name has no `&`); once the outline lands, the full "{sequence} | {section} | Open edX Demo Course | My Open edX".
5. **The sidebar copes.** The open sidebar shows a loading spinner briefly, then works as expected, with no error.

**From the code, not observed on master:**

6. **An outline failure on the course-end page no longer redirects to the course home.** Before #2023 the course-end route rendered `CourseExit` inside `<TabContainer tab="courseware" fetch={fetchCourse} slice="courseware">`: an outline failure with access made `fetchCourse` dispatch `fetchCourseDenied`, and `TabPage`'s denied path took `getAccessDeniedRedirectUrl`'s `default` branch (no `errorCode`, `activeTabSlug` not `outline`) to `/course/{courseId}/home`, as the courseware page still does through `outlineFailureRedirect`. #2023's `useCourseExitStatusBridge` derives course-end's status from the two metadata queries alone, so a failed outline leaves `hasScheduledContent` `undefined` as a pending one does, permanently: the mode falls through as in 2.

**Readers that cope, from the code:** `useSequenceIds` and the redirect rules are gated on `useIsCourseLoaded`; `Course.jsx` and `Sequence.jsx` read the section as `{}`; `GetCourseExitNavigation`'s `hasScheduledContent` is `undefined`, but both callers use its result only with `isLastUnit`, which stays `false` until the course is loaded.

**Tasks**

- Decide the contract: gate both pages on the outline again (the pre-conversion behavior, which covers 1–4), or keep rendering during the outline's tail and make each outline reader handle it pending.
- Implement it, with tests that hold the outline request pending (as `initializeTestStore`'s `preventOutlineSidebarLoad` does for the sidebar's navigation request) for the breadcrumbs and the course-end page.
- Restore the course-end page's redirect to the course home on an outline failure with access (6).
- Re-run the observations above with the delay.

**Sequencing:** lands before #2089's layer A, which converts these pages' `coursewareMeta` and `sections` reads.

**Verify:** with the outline request delayed, a unit page with the breadcrumbs plugin inserted renders without the error; a hard reload of the course-end page for an in-progress learner shows `CourseInProgress` and does not redirect; the navigation arrows work once shown; with the outline request failing, the course-end page redirects to the course home; the full suite is green.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

