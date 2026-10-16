# Manual testing — read `courseHomeMeta` from the query: courseware, shared, and widgets (#2086)

In-browser verification against a live backend (tutor dev).

What changed: the last 22 readers of the course-home metadata that went
through the model store now read the metadata query directly, as disabled
observers under the page that fetches it (`CoursewareContainer` for the
courseware subtree, `CourseExit` for the course-end page, every tab page for
`ProductTours`, the streak modal and the tour button). The two celebration
writers patch the query cache instead of the Redux model. The bridge entry is
gone, so `useModel('courseHomeMeta')` returns `{}` for anyone still calling it.
Nothing fetches differently and the server-side celebration POSTs are
untouched.

**The three bugs this layer could introduce.** (1) A reader that fetches: a
forgotten `{ enabled: false }` shows up only as a second `course_metadata`
request on that reader's page. (2) A reader that never sees data: a disabled
observer with no owner above it reads `undefined` forever, so its component
sits in its no-data branch without erroring — a paywall that never renders, a
link that never appears, an `org_key` of `undefined` in a tracking event. (3)
A celebration that repeats: if the cache write misses, the first-section modal
shows again at the next section boundary in the same session, or the streak
modal reopens on the next tab navigation. Everything below is one of those
three checks.

## Setup

An ordinary course with a **verified mode**, at least two sections with
graded content, a **gated** (verified-only) unit if content gating is
enabled, and a subsection with **hide after due** set with a past due date.
Two accounts: an **enrolled learner** and a **staff** user who can masquerade.

For the celebrations: a **fresh enrolment** in a course with celebrations
enabled (the `course_metadata` payload shows `celebrations.first_section:
true`), and, optionally, a learning goal set and met for the weekly-goal
modal. A three-day streak is unlikely to be producible; mark it *not run*.

For the course-end page: the learner has completed the course (or staff visits
`/course/:id` directly).

## Verify by hand

**`org_key` in tracking events is not observable on this setup.** Every event
this layer touches goes through frontend-platform's `sendTrackEvent`, which
returns without doing anything when `SEGMENT_KEY` is unset
(`SegmentAnalyticsService.js:233`), so no request appears in the Network tab.
The `org_key` sub-checks below are therefore recorded as *not observable*; the
`org` reads behind them are the same one-line swap as every other reader and
are covered by the unit suites. (To observe them: set any `SEGMENT_KEY` in
`env.config.jsx`; the Segment stub then queues each `track` call on
`window.analytics`, inspectable in the console.)

### Request count — one per page (the #2098 protocol)

Hard reload, wait for the Network tab to go idle, count
`/api/course_home/course_metadata/`:

- [x] a courseware unit: **1**
- [x] the course-end page (`/course/:id`): **1**
- [x] outline → courseware crossing: clear the log after the outline is idle,
      click a sequence title, wait for idle: **1**
- [x] navigating unit → unit and sequence → sequence inside the courseware:
      **0** further `course_metadata` requests

### Courseware readers (`CoursewareContainer` owns the query)

The staff flags (`Course.jsx`, `Sequence.jsx` read `isStaff` and
`originalUserIsStaff`):

- [x] as a non-staff learner, a `/preview/...` unit URL redirects to the plain
      `/course/...` URL
- [x] as staff on a `/preview/...` unit URL, the unit iframe's `src` carries
      `preview=1` (learner view: `preview=0`)
- skipped — jump-navigation breadcrumbs as staff (`ENABLE_JUMPNAV`): not
      enabled on this setup and not worth turning on for this; `isStaff`
      reaches `BreadcrumbItem` unchanged through `CourseBreadcrumbsSlot`

Components with their own read:

- not run — `LockPaywall`: needs content gating and a gated unit, not set up
      here; its read is covered by `LockPaywall.test.jsx`, which mounts the
      owner's hooks and finds the price link once the fetch lands
- not run — `HonorCode`: needs a graded unit for a learner who has not signed
      the integrity agreement; its read is covered by `HonorCode.test.jsx`,
      which seeds the query and posts (or, masquerading, does not)
- [x] `HiddenAfterDue`: a hidden-after-due subsection shows the notice with a
      working *progress page* link (the course id now comes from the route,
      not a prop)
- not run — `UpgradePanel`: needs the `UPGRADE` sidebar widget registered in
      `env.config.jsx` (it is not on this setup) plus an audit learner in a
      course with a verified mode; its read is covered by
      `UpgradePanel.test.jsx`, which mocks the hook with the same fixture it
      mocked `useModel` with
- not run — `SidebarContextProvider`: its read is observable only through a
      widget whose `isAvailable` reads `course`, and the upgrade widget is the
      only one; same setup as above

### Course-end readers (`CourseExit` owns the query)

On the celebration page (`/course/:id` after completing the course):

- [x] `CourseExitContent`: the page shows the celebration body rather than
      redirecting to the outline (reads `canViewCertificate`, `isMasquerading`)
- [x] `CourseCelebration`: the *Congratulations!* header and the image; the
      browser tab title is `Congratulations! | <course title> | <site name>`
      (`title` from the query); its visit event's `org_key`: not observable
- [x] `CatalogSuggestion`: *Looking to learn more?* with the *search our
      catalog* link (its click event,
      `edx.ui.lms.course_exit.catalog_search.clicked` with `org_key`: not
      observable, see above)

Branches this setup does not show:

- not run — `CourseCelebration`'s certificate block (needs certificate data)
- not run — `DashboardFootnoteLink`: the *dashboard* footnote under the
      celebration content renders only in the certificate branches; its click
      would send `edx.ui.lms.course_exit.dashboard_footnote.clicked` with
      `org_key`
- not run — `SocialIcons` (needs a `marketing_url` on the course)
- not run — `UpgradeFootnote` (an audit learner on a course with an upgrade
      deadline)
- not run — `CourseRecommendations` (needs discovery recommendations; the
      catalog suggestion is its fallback)
- not run — `CourseNonPassing`: the *View grades* button goes to the progress
      tab (an ended course, not passing)
- not run — `CourseInProgress`: the *View course schedule* button goes to the
      dates tab (scheduled content, not passing)

### Tab-page readers (every tab owner)

- [x] outline: the *Launch tour* button renders in the course tools widget
      (tours enabled for the account) and clicking it starts the course-home
      tour; its click event's `org_key`: not observable
- not run — the new-user course-home tour and the courseware tour end to end
      for a user with tours enabled (not set up for this pass; `ProductTours`'
      read is `username` for the proctoring-info query, covered by
      `ProductTours.test.jsx` under the outline and courseware owners)

### Celebrations (the cache writes)

- not run — first section: with a fresh enrolment, click *Next* past the
      first section's last unit. The *Congratulations!* modal shows once; the
      Network tab shows one POST to `/api/courseware/celebration/:id` with
      `first_section: false`; closing it and crossing the **next** section
      boundary in the same session shows no second modal; a reload shows
      none either. (Needs a fresh enrolment in a course with celebrations
      enabled — not set up for this pass. The write is covered by
      `celebration/utils.test.jsx` against a real query cache.)
- not run — the modal's social icons (needs `marketing_url`); its open
      event's `org_key`: not observable
- not run — weekly goal: with a goal set and met, load a unit: the *You met
      your goal!* modal shows once with the goal's days per week; its POST
      sends `weekly_goal: false` (needs a goal set and met)
- not run — streak: with a pending streak, the modal opens once on load;
      closing it does not reopen it on the next tab navigation (needs a
      three-day streak; the close-time write is covered by
      `StreakCelebrationModal.test.jsx`)

### Plugins

- not run — a widget or plugin still calling
      `useModel('courseHomeMeta', courseId)` gets `{}` (needs a sidebar widget
      or `PluginSlot` plugin wired into `env.config.jsx` with that call; the
      behaviour is exactly what dropping the bridge entry does, and the README
      section plus the BREAKING CHANGE footer are the mitigation)

## Results

Run on tutor dev, 2026-09-23, on the B3 layer. 11 checks run, all passing: the
four request counts (a courseware unit, the course-end page, the outline →
courseware crossing, and in-courseware navigation adding none), the two
preview checks from the staff flags, the hidden-after-due notice's progress
link, the three readers visible on the celebration page, and the *Launch tour*
button on the outline. 17 checks marked *not run*: each needs course or account
state this environment was not set up for (content gating, an unsigned honor
code, the upgrade sidebar widget, certificate data, a `marketing_url`, an
upgrade deadline, discovery recommendations, a not-passing or in-progress
course end, tours end to end, a fresh enrolment for the celebration modals, a
weekly goal, a three-day streak, an out-of-repo `useModel` caller); each names
the unit case that covers its read. One check skipped (jump-navigation
breadcrumbs, not enabled and not worth enabling). No `org_key` was observable:
every event this layer touches is a `sendTrackEvent`, which is inert without a
`SEGMENT_KEY`. Nothing failed; the not-run checks were not exercised.

## Not covered

- The live and discussion tabs: their only B3 readers (`ProductTours`, the
  streak modal) are the ones every other tab exercises; their once-per-load
  counts are pinned by their suites.
- `useModel` reads of `coursewareMeta`, `sequences`, `sections`, `units` and
  `discussionTopics` in the converted files — D and C layers.
- The celebration POST itself (unchanged; #1973 converts it to a mutation).
