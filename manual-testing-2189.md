# Manual testing — the dates tab (#2189, PR #2234)

This layer brings the first real page: the dates tab inside the ported tab-page frame, with
the root providers and the query client settings. What is verified by hand is what a
learner sees on the dates tab in each access state, the frame around it, and the query
behavior the test client's `retry: false` hides. The other tabs are still stubs.

## Environment

- The package's dev site on `bsmith/dates-tab` (`c3a07fcf`): `cd frontend-base && nvm use
  && npm ci && npm run dev`, served at `http://apps.local.openedx.io:2000/learning/`, with
  tutor dev's `mfe` service stopped so the port is free.
- Tutor dev, the LMS's learning URL pointing at `apps.local.openedx.io:2000/learning`, as
  for #2188.
- Courses: the demo course `course-v1:OpenedX+DemoX+DemoCourse`, and for the suggested
  schedule a self-paced course with an assignment due date in the past (the shift-dates
  alert shows only when `datesBannerInfo.missedDeadlines` is true). Record which course
  was used, and whether it has a verified mode.
- Users: a staff user, an enrolled audit learner, a signed-in unenrolled learner, and an
  anonymous session.

## Verify by hand

Requests and console output count only when Learning's code starts them. The shell's own
(the course bar's and masquerade bar's metadata requests, for example) are noted when
they show up, not counted against a box.

- [x] **Timeline for an enrolled learner** — at `/learning/course/<courseId>/dates`: the
      "Important dates" heading and the timeline grouped by day, with today's marker,
      inside the shell header and course bar, and the browser tab titled
      `<dates tab title> | <course title> | <site name>`, the tab title as the course bar shows it.
- [ ] **Upgrade alert** — on the self-paced course with no missed deadline, as an audit
      learner on a course with a verified mode and content gating: the suggested-schedule
      header and the "Upgrade to unlock" alert with "Upgrade now" (`UpgradeToCompleteAlert`
      through `BannerDatesUpgradeSlot`).
- [ ] **Shift-dates alert** — on the self-paced course with a missed deadline and no missed
      gated content (a verified learner, or a course without gating): the
      suggested-schedule header and "It looks like you missed some important deadlines…"
      with "Shift due dates" (`ShiftDatesAlert`).
- [ ] **Upgrade-to-shift alert** — as the audit learner after missing a deadline on gated
      content: the suggested-schedule header and the alert with "Upgrade to shift due
      dates" (`UpgradeToShiftDatesAlert`).
- [ ] **Shift dates and the toast** — click "Shift due dates": the dates reload with the
      new due dates and a toast shows the LMS's message.
- [ ] **Providers persist across a tab switch** — with the toast open, switch to another
      tab in the course bar and back within the toast's display time: the toast is still
      open, and the network panel shows no document request.
- [x] **Signed-in unenrolled learner redirects** — on the dates path: redirected to the
      course home stub at `/learning/course/<courseId>/home`, with no flash of the dates
      page. `enrollment_required` takes `getAccessDeniedRedirectUrl`'s default case, which
      sends every tab but the outline there, as on `master`; the enrollment alert shows
      only on the outline (#2191).
- [x] **Anonymous learner redirects** — on the dates path: redirected to the course home
      stub, the same way (`authentication_required`); the logistration alert, likewise,
      only on the outline.
- [ ] **Course not started redirects** — on the dates path of a course whose start is in
      the future: redirected to the redirect stub at
      `/learning/redirect/dashboard?notlive=<start date>` (`course_not_started`).
- [ ] **Loading state** — with the network throttled, the spinner shows before the timeline,
      with "Loading course page…" as its screen-reader text.
- [ ] **Error state on a 4xx** — with the request to `/api/course_home/dates/<courseId>`
      blocked or answered with a 4xx: the frame's error page shows after the first
      failure, with no retries in the network panel (`master`'s retry policy), and the
      failure is logged once.
- [x] **No refetch on focus** — leave the window and come back: no new request from
      Learning's queries to the dates or metadata endpoints. The shell's course bar
      refetching `course_metadata` on focus is expected (a known difference, from
      #2221).
- [x] **Masquerade** — as staff, masquerade as a learner from the masquerade bar: the dates
      tab reloads for that learner.
- [ ] **Console** — no error or warning from the app's own code on any of the above.

## Known gaps, recorded not fixed

- [ ] **Encoded course id** — a course id with an encoded character in the path (for
      example `course-v1:OpenedX%2BDemoX%2BDemoCourse`): record what renders. `master`
      decodes it in a wrapper around the course routes, which #2195 brings back as a
      layout route.

## Left to the automated suite

- Dates tab rendering, its alerts and their analytics events, through the route array:
  `src/course-home/dates-tab/DatesTab.test.jsx`.
- Frame states and access-denied redirects: `src/tab-page/TabPage.test.jsx`,
  `src/shared/access.test.ts`.
- Retry, focus refetch and query error logging: `src/queryClient.test.ts`.
- No page-rule diagnostics on any route once its page has rendered: `src/routes.test.tsx`.

## Coverage against the baseline

Codecov line coverage, `master` at `50faa452` (the baseline, `coverage-baseline-master.tsv`)
against #2234's head `ad85041b`. Codecov counts a line with an untaken branch as a miss, so
the head's misses are the six lines the PR names.

| Directory | `master` (hits / lines) | #2234 (hits / lines) |
|---|---|---|
| `course-home/dates-tab` | 122 / 124, 98.39% | 113 / 113, 100% |
| `course-home/suggested-schedule-messaging` | 57 / 58, 98.28% | 37 / 38, 97.36% |
| `course-home/data` | 277 / 278, 99.64% | 223 / 224, 99.55% |
| `tab-page` | 108 / 108, 100% | 68 / 72, 94.44% |

`master`'s numbers come from its whole suite, the outline, progress and courseware tests
included; #2234's from the package's tests alone. Each line #2234 misses is one `master`
covers through a suite a later port brings (the PR's Testing section names them).

## Results

**First look, 2026-10-29, Brian, on `ad85041b`, against master.openedx.io.** Two styling
differences on the dates tab:

- The timeline has no vertical line or dots; each day sits under a full-width horizontal
  rule. Cause: `master` loads `Day.scss` only through `@import
  "course-home/dates-tab/timeline/Day.scss"` in `src/index.scss`, which is not ported. The
  dates commit copies `Day.scss` unchanged, and nothing in the package imports it: the
  package's `style.scss`, imported from `Main.tsx`, holds only Paragon's breakpoints.
- The course tabs are gray with a dark active tab and a thin underline, where `master`'s
  are blue-on-hover with a thick primary underline. Cause: the tabs are the shell's
  `CourseTabsNavigation` (frontend-base 2.0.0-alpha.17), a Paragon `Nav variant="tabs"`
  with its own two-rule `course-tabs-navigation.scss`; `master`'s look is Learning's own
  `CourseTabsNavigation` with `.nav-underline-tabs` from `src/index.scss`. Not code this PR
  ports; filed as openedx/frontend-base#332. The org and course title missing above the tabs is the header title line, #2193.

**Checklist pass, 2026-10-30, Brian, on `a31718b0` (`Day.scss` loaded from
`style.scss`).** The timeline now renders with its line and dots, as on `master`.

- No refetch on focus: switching browser tabs and back sends
  `GET /api/course_home/course_metadata/<courseId>`. The call stack runs from
  query-core's `focusManager` through `queryCache.onFocus` to the `queryFn` in the
  shell's `CourseTabsNavigation`. That query is the shell's course bar
  (`['org.openedx.frontend.app.header.courseMeta', courseId]`, `retry: 2`, no
  `refetchOnWindowFocus`), on the shell's client with the library's defaults, so it
  refetches on focus. Learning's own metadata query
  (`[appId, 'courseHome', 'metadata', courseId]`) sets `refetchOnWindowFocus: false`
  through `queryDefaults` and is not in the stack. The course bar came with #2221.
- The signed-in unenrolled and anonymous learners are both redirected from the dates
  path to the course home stub. `master` does the same: `authentication_required` and
  `enrollment_required` fall into `getAccessDeniedRedirectUrl`'s default case, so the
  enrollment and logistration alerts render only on the outline (#2191). The issue's
  manual-testing plan, which listed both alerts for the dates tab, was wrong.
