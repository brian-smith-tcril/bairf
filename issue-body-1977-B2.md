Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layer B2**. Depends on B1 (#2084).

**Goal:** convert the shared, course-home and alert readers of the `courseHomeMeta` model to the query. Half of the 53 `courseHomeMeta` readers; B3 (#2086) takes the rest and removes the bridge entry.

**Tasks** — 31 sites, each `useModel('courseHomeMeta', courseId)` → `useCourseHomeMeta(courseId, { enabled: false }).data ?? {}`:
- `tab-page/TabPage.tsx:76`, `tab-page/LoadedTabPage.tsx:39`.
- `alerts/` (9): `access-expiration-alert/hooks.js:30` (only its `'courseHomeMeta'` read — the `useModel(tab, …)` read is layer E / #1999), `active-enteprise-alert/hooks.js:8`, `course-start-alert/CourseStartAlert.jsx:26`, `course-start-alert/CourseStartMasqueradeBanner.jsx:16`, `course-start-alert/hooks.js:11,21,43`, `enrollment-alert/EnrollmentAlert.jsx:25`, `enrollment-alert/hooks.js:14`.
- `course-home/outline-tab/` (12): `OutlineTab.jsx:40`, `DateSummary.jsx:19`, five alert sites (`certificate-status-alert/hooks.js:37`, `course-end-alert/hooks.js:14`, `private-course-alert/PrivateCourseAlert.jsx:28` and `private-course-alert/hooks.js:11`, `scheduled-content-alert/hooks.js:22`), and five `widgets/` readers (`CourseDates`, `CourseTools`, `ProctoringInfoPanel`, `StartOrResumeCourseCard`, `WeeklyLearningGoalCard`).
- `course-home/progress-tab/` (5): `certificate-status/CertificateStatus.jsx:30`, `grades/course-grade/CourseGradeHeader.jsx:17`, `grades/detailed-grades/DetailedGrades.jsx:22`, `grades/detailed-grades/SubsectionTitleCell.jsx:25`, `related-links/RelatedLinks.jsx:16`.
- `course-home/dates-tab/` (2): `DatesTab.jsx:28`, `timeline/Day.jsx:29`.
- `course-home/courseware-search/CoursewareSearch.jsx:27`.

**Verify:** every course-home tab renders identically, including the tab-navigation active state and the Helmet title (both built from `tabs` by B1's `course-tabs/utils.ts` helpers); the course-start and enrollment alerts behave as before; no new requests — count `course_metadata` on one course-home page load and on the outline → courseware crossing (#2098's protocol), before and after; expected one each.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **`{ enabled: false }` at every site (updated after #2098).** Each course-home tab wrapper (`OutlineTab`, `DatesTab`, `ProgressTab`, `LiveTab`, `DiscussionTab`) and `CoursewareContainer` already fetch the metadata query and pass it to `TabPage`, and every site here renders under one of them — `LoadedTabPage`, which renders `ProductTours`, the streak modal and the tab navigation (and with it `CoursewareSearch`), sits inside `TabPage`. As fetching observers they would mount after the data landed and refetch it, the defect #2083 fixed for the tab readers and #2098 for the courseware gate; #2098 added the `{ enabled }` option to `useCourseHomeMeta` for exactly this.
- **`?? {}` at every site.** `useModel` returns `{}` for a missing model; a pending query returns `undefined`. Most of these readers render below `TabPage`, which only renders children once the metadata query has resolved, but the default keeps the conversion faithful for the ones that don't.
- **B1 removed `rootSlug`**, so `useCourseHomeMeta` takes no variant argument and no site names one.
- **`LoadedTabPage` and the two progress-tab links read `tabs`**, and B1 moved the tab lookups into `course-tabs/utils.ts` (`isActiveTab`, `getActiveTabTitle`, `getCourseOutlineUrl`, `getDatesTabUrl`, `getProgressTabUrl`). Their conversion here is only the data source — the lookup logic is already settled — but the nav highlight, Helmet title and course-home links are worth an explicit check in manual testing.
- **`access-expiration-alert/hooks.js` converts only half here.** Its `useModel('courseHomeMeta', courseId)` read converts; the `useModel(tab, courseId)` read is the dynamic tab-model read that #1999 owns, and it is the last thing to go (layer E).
