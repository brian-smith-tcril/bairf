# Manual testing — read `courseHomeMeta` from the query: tab-page, alerts, and course-home tabs (#2085)

In-browser verification against a live backend (tutor dev).

What changed: 31 readers of the course-home metadata that went through the
model store now read the metadata query directly, as disabled observers under
the page that fetches it (`OutlineTab`, `DatesTab`, `ProgressTab`, `LiveTab`,
`DiscussionTab`, `CoursewareContainer`, `CourseExit`, `CourseAccessErrorPage`).
Three progress/outline components take their tab links from new hooks
(`useCourseOutlineUrl`, `useDatesTabUrl`, `useProgressTabUrl`) instead of a
`tabs` array. Nothing fetches differently.

**The two bugs this layer could introduce.** (1) A reader that fetches: a
forgotten `{ enabled: false }` shows up only as a second `course_metadata`
request on that reader's page. (2) A reader that never sees data: a disabled
observer with no owner above it reads `undefined` forever, so its component
sits in its no-data branch without erroring — a header with no course title,
an alert that never appears, a link that never renders. Everything below is
one of those two checks.

## Setup

An ordinary **self-paced** course with graded subsections, a dates tab, a
progress tab, and a verified mode. Two
accounts: an **enrolled learner** and a **staff** user who can masquerade.
For the alert checks, an **unenrolled** learner (or the staff user, not
enrolled) and a course whose **start date is in the future**.

Optional, for the certificate-status alert's *View grades* button: a course
that has **ended** with the learner **not passing** on a **verified**
enrolment.

## Verify by hand

### Request count — one per page (the #2098 protocol)

Hard reload, wait for the Network tab to go idle, count
`/api/course_home/course_metadata/`:

- [x] outline (`/course/:id/home`): **1**
- [x] dates: **1**
- [x] progress: **1**
- skipped — live: not configured on this setup; its count is pinned by
  `LiveTab.test.jsx`
- [x] a courseware unit: **1**
- [x] the course-end page (`/course/:id`, after completing the course or via a
      direct visit as staff): **1**
- [x] outline → courseware crossing: clear the log after the outline is idle,
      click a sequence title, wait for idle: **1**
- [x] client-side navigation across the tabs (outline → dates → progress →
      outline): **1 per navigation**, none extra

### Readers that render on every tab (`TabPage`, `LoadedTabPage`)

On each of outline, dates, progress and a courseware unit:

- [x] the header shows the course org, number and title
- [x] the browser tab title on the course-home tabs is
      `<tab title> | <course title> | <site name>`, where the first segment is
      the LMS title of the tab that claims the page: "Course" on the outline
      (the outline maps to the `courseware` tab), then "Dates", "Progress".
      On a courseware unit `Course.jsx` sets its own title from the breadcrumb
      trail, so this check does not apply there
- [x] the nav highlights the right tab (Course on outline **and** on a
      courseware unit)
- [x] as staff: the instructor toolbar renders, with *View course in Studio*
      when the account has author access
- [x] courseware search (the magnifier in the tab nav) opens and a submitted
      search sends `edx.course.home.courseware_search.submit` with `org_key`
      set (Network tab → the segment/tracking request, or the console with
      analytics logging on)

### Links built from a tab URL (the new hooks)

- [x] progress → *Related links*: the **Dates** and **Course outline** links
      render and go to the right pages
- [x] progress → detailed grades: the *course outline* link in the empty-table
      message renders (a course with no graded scores yet) and goes to the
      outline
- not run — outline, ended course, not passing, verified enrolment: the
      certificate-status alert shows *View grades* and it goes to the
      progress tab

### Outline tab

- [x] course dates widget shows dates in the learner's timezone (set a
      non-UTC timezone in account settings; the dates shift)
- [x] course tools widget renders its links
- not run — proctoring info panel renders when the course has proctored exams
      (otherwise absent, as before)
- [x] start / resume course card renders and the click is tracked with
      `org_key`
- not run — weekly learning goal card renders; saving a goal works
- [x] date summary rows under the outline (upcoming dates) use the timezone
- not run — course-end alert appears on a course ending within the alert window
- not run — scheduled-content alert appears on a self-paced course with scheduled
      (not yet released) content
- not run — private-course alert as an **unenrolled** learner on a private course
- not run — enrollment alert as an unenrolled learner (above the tab nav) — the
      *Enroll now* button enrolls and reloads

### Alerts that depend on `courseHomeMeta` directly

- not run — course-start alert: enrolled learner, course start in the future — the
      *starts on* alert on the outline
- not run — course-start masquerade banner: staff masquerading as a learner on the
      **progress** tab of a not-yet-started course
- not run — access-expiration masquerade banner: staff masquerading as a learner
      whose audit access has expired, on outline and dates (the banner reads
      `userTimezone` from this layer's read and the rest from the tab model)
- not run — active-enterprise alert: `/course/:id/access-denied` for a learner whose
      access code is `incorrect_active_enterprise` (or confirm the page
      renders its alert list for a denied learner)

### Dates tab

- [x] day rows render with the learner's timezone; today/overdue badges as
      before

### Progress tab

- not run — grade summary header renders org-tracked links (the *view grading
      policy* / upgrade links, when shown)
- [x] detailed grades table renders; subsection titles link into the course
- not run — certificate status side panel renders for the enrolment's state
- [x] as staff, `/progress/:otherUserId` shows *Course progress for <user>*

### Streak celebration

- not run — with a pending streak (three consecutive days), the streak modal opens
      once on load; closing it does not reopen it on the next tab navigation

## Results

Run on tutor dev, 2026-09-23. 21 checks run, all passing. 14 checks
marked *not run*: each needs course or account state this environment was not
set up for (proctored exams, a weekly-goal save, a course ending within the
alert window or with scheduled content, an unenrolled learner on a private
course, a future start date, masquerading as an expired or not-yet-started
learner, an `incorrect_active_enterprise` learner, verified/certificate
states, a three-day streak). None of them failed; they were not exercised.
The live tab was skipped as not configured. Both request-count checks and
every reader on the outline, dates, progress, courseware and course-end pages
were confirmed, including `org_key` in the resume-course and courseware-search
tracking events.

## Not covered

- The live tab: not configured on this setup, so not exercised by hand. Its
  once-per-load count is pinned by `LiveTab.test.jsx`, and its B2 readers are
  the shared ones (`TabPage`, `LoadedTabPage`, the alerts) every other tab
  exercises.
- The discussion tab: on this setup the Discussion entry is served by the
  separate discussions MFE, so learning's `DiscussionTab` page is not
  reachable by hand. Its once-per-load count is pinned by
  `DiscussionTab.test.jsx`, and its only B2 readers (`TabPage`,
  `LoadedTabPage`, the alerts) are the ones every other tab exercises.
- Cross-tab reads of the outline model (`useEnrollmentAlert`,
  `useLogistrationAlert` outside the outline tab) — unchanged by this layer.
- B3 sites (courseware, course-exit, streak/celebration modals' own reads).
