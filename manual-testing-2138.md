# Manual testing — handle a slow or failed outline on the courseware and course-end pages (#2138)

In-browser verification against a live backend (tutor local).

What changed: while the learning-sequences outline is pending, the unit
navigation renders disabled, `Course` leaves `LoadedTabPage`'s page title in
place, the inserted breadcrumbs show their not-loaded state instead of
throwing, and the course-end page waits for the outline through `TabPage`
(`tabDataQueries`); on an outline failure with access the course-end page
redirects to the course home. No request change intended.

**The bugs this layer could introduce.** (1) *Navigation stuck disabled* —
`disabled` now also depends on the link, so a control whose link never
arrives would stay disabled after the outline lands. (2) *A missing title* —
if `Course`'s `<Helmet>` never rendered, the tab would keep the loading title.
(3) *Course-end stuck loading, or waiting on the wrong thing* — the page now
waits on three queries. (4) *A redirect where there should be none* — the new
course-end redirect firing without an outline failure, or without access.

## Setup

- **Outline delay (temporary):** at the top of `getLearningSequencesOutline`
  in `src/courseware/data/api.js`,
  `await new Promise((resolve) => { setTimeout(resolve, 8000); });`.
  Checks marked *delayed* need it; the rest run without it.
- **Breadcrumbs:** `env.config.jsx` inserting `CourseBreadcrumbs` directly into
  `org.openedx.frontend.learning.course_breadcrumbs.v1` (`RenderWidget:
  CourseBreadcrumbs`, `priority: 50`), not the `DelayedBreadcrumbs` wrapper
  used while choosing the pending display, which would mount after the outline
  and hide the bug.
- **In-progress course-end learner (temporary pins, as in #2138's repro):** in
  the normalizers, `hasScheduledContent: true` on the outline,
  `courseExitPageIsActive: true`, `userHasPassingGrade: false`,
  `certificateData: { certStatus: 'audit_notpassing' }` on the courseware
  metadata, and `canViewCertificate` on the course-home metadata, `false` or
  `true` per check.
- Devtools Network filtered to `learning_sequences|courseware/course|course_metadata`, Console open.

## Checks

### Courseware page, outline delayed

- [x] **Breadcrumbs (delayed):** hard-reload a full unit URL: while the outline is pending the region shows "Course / / ", no "An unexpected error occurred", no `TypeError` in the console; once it lands, the section and sequence crumbs.
- [x] **Navigation (delayed):** while pending, the top previous/next arrows and the bottom Previous/Next buttons render disabled; once the outline lands they enable and navigate (next unit, and across a sequence boundary).
- [x] **Page title (delayed):** while pending, "{tab} | {course} | {site}" (no leading "|", no empty segment); once the outline lands, "{sequence} | {section} | {course} | {site}".

### Course-end page, outline delayed (in-progress learner)

- [x] **`canViewCertificate: false` (delayed):** hard-reload `/course/{courseId}/course-end`: header, loading spinner and footer, no redirect to `/course/{courseId}`; once the outline lands, `CourseInProgress` ("More content is coming soon!").
- [x] **`canViewCertificate: true` (delayed):** the same; no flash of `CourseNonPassing` ("You've reached the end of the course!") before `CourseInProgress`.
- [x] **Through Next (delayed):** on the last unit, once its outline has loaded, Next opens `CourseInProgress` with no spinner (everything is cached).

### Outline failure

Replace the delay with a failure: at the top of `getLearningSequencesOutline`,
`throw Object.assign(new Error('simulated'), { response: { status: 500 } });`.

- [x] **Course-end page:** hard-reload `/course/{courseId}/course-end`: redirected to `/course/{courseId}/home`.
- [x] **Courseware page (unchanged):** hard-reload a unit URL: redirected to `/course/{courseId}/home`, as on `master`.

### No delay (regression)

- [x] **Courseware:** a unit renders with breadcrumbs, working navigation and the full title; the first unit's Previous is disabled; on the last unit, with the exit page active, the bottom button reads "Complete the course" and it and the top next arrow are enabled and both go to `/course/{courseId}/course-end`, as on `master` (the no-exit-page case, Next disabled, is covered by `UnitNavigation.test`, not by this learner).
- [x] **Course-end, in-progress pins:** `CourseInProgress` on a hard reload and through Next.
- [x] **Course-end, no pins:** the mode the learner actually has (celebration, not passing, or the redirect for `disabled`), as on `master`.
