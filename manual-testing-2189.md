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
- Courses: the demo course `course-v1:OpenedX+DemoX+DemoCourse`. The three alert boxes and
  the shift-dates box run on it with faked responses (next section), not on a course set
  up in the LMS.
- Users: a staff user, an enrolled audit learner, a signed-in unenrolled learner, and an
  anonymous session.

## Faking responses

Chrome's local overrides replace a response's body before the app reads it.

1. Open DevTools, Network panel, and load `/learning/course/<courseId>/dates`.
2. Right-click the request named below, **Override content**. The first time, Chrome asks
   for a folder to keep overrides in; pick an empty one and allow access.
3. The response opens in the Sources panel. Edit it, save (Ctrl+S), and reload the page.
4. To undo, untick **Enable Local Overrides** in Sources, Overrides.

Edit the LMS's own snake_case response; the app converts it. Two requests are overridden:

- **The metadata request**: `course_metadata/course-v1:OpenedX+DemoX+DemoCourse?browser_timezone=…`.
  Learning's request carries `?browser_timezone=`; the one without it is the shell's
  course bar, which these boxes leave alone.
- **The dates request**: `dates/course-v1:OpenedX+DemoX+DemoCourse`.

The demo course has no assignment, and the alerts render only for a self-paced course
with one (`isSelfPaced && hasDeadlines` in `DatesTab.jsx`), so each faked box adds this
block to the dates response's `course_date_blocks` list:

```json
{
  "assignment_type": "Homework", "complete": false, "date": "2026-10-20T00:00:00Z",
  "date_type": "assignment-due-date", "description": "", "learner_has_access": true,
  "link": "", "link_text": "", "title": "Faked assignment", "extra_info": null,
  "first_component_block_id": ""
}
```

Results record which boxes ran on faked responses.

## Verify by hand

Requests and console output count only when Learning's code starts them. The shell's own
(the course bar's and masquerade bar's metadata requests, for example) are noted when
they show up, not counted against a box.

- [x] **Timeline for an enrolled learner** — at `/learning/course/<courseId>/dates`: the
      "Important dates" heading and the timeline grouped by day, with today's marker,
      inside the shell header and course bar, and the browser tab titled
      `<dates tab title> | <course title> | <site name>`, the tab title as the course bar shows it.
- [x] **Upgrade alert** — faked, as an enrolled learner.
      - Metadata request: set `"is_self_paced": true`.
      - Dates request: set `"has_ended": false`, add the faked assignment block to
        `course_date_blocks`, and replace `dates_banner_info` with:
        ```json
        {
          "content_type_gating_enabled": true,
          "missed_deadlines": false,
          "missed_gated_content": false,
          "verified_upgrade_link": "https://example.com/upgrade"
        }
        ```
      - Expect the suggested-schedule header and the "Upgrade to unlock" alert with "Upgrade now"
        (`UpgradeToCompleteAlert`), and neither shift alert.
- [x] **Shift-dates alert** — faked, as an enrolled learner.
      - Metadata request: set `"is_self_paced": true`.
      - Dates request: set `"has_ended": false`, add the faked assignment block to
        `course_date_blocks`, and replace `dates_banner_info` with:
        ```json
        {
          "content_type_gating_enabled": false,
          "missed_deadlines": true,
          "missed_gated_content": false
        }
        ```
      - Expect the suggested-schedule header and "It looks like you missed some important
        deadlines…" with "Shift due dates" (`ShiftDatesAlert`), and neither upgrade alert.
- [x] **Shift dates and the toast** — faked, with the **Shift-dates alert** overrides still
      in place. Nothing else is overridden: the POST goes to the LMS.
      - Click "Shift due dates".
      - Expect `POST /api/course_experience/v1/reset_course_deadlines` with `course_key` and
        `research_event_data: {"location": "dates-tab"}`, answered 200; a toast reading
        "Your due dates have been successfully shifted to help you stay on track." with
        "View all dates"; then a new dates request.
      - The alert stays and the dates do not move: the LMS answers 200 with that body
        whether or not it had a schedule to shift, and the refetch gets the override
        again. Moving the dates is the LMS's part, not checked here.
- [x] **Providers persist across a tab switch** — right after the toast box, with the same
      overrides in place and the Network panel filtered to **Doc**.
      - Before the toast closes itself, click **Progress** (or **Course**) in the course
        bar, then **Dates**. Those tabs are Learning's routes, so the course bar switches
        them client-side; Discussion, Teams and Instructor are LMS pages and load in full.
      - Expect the toast showing again on the dates page, and no new entry in the
        Doc-filtered list: the toast's state lives in `ToastProvider` in `Main.tsx`, above
        the routes, while `TabPage` renders the toast itself, so only a soft navigation
        keeps the state. A full page load would add a Doc entry and lose the toast.
- [x] **Upgrade-to-shift alert** — faked, as an enrolled learner.
      - Metadata request: set `"is_self_paced": true`.
      - Dates request: set `"has_ended": false`, add the faked assignment block to
        `course_date_blocks`, and replace `dates_banner_info` with:
        ```json
        {
          "content_type_gating_enabled": true,
          "missed_deadlines": true,
          "missed_gated_content": true,
          "verified_upgrade_link": "https://example.com/upgrade"
        }
        ```
      - Expect the suggested-schedule header and the alert with "Upgrade to shift due dates"
        (`UpgradeToShiftDatesAlert`), and neither of the other two.
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

## Known gaps, not checked here

- **Encoded course id** — a course id with an encoded character in the path (for example
  `course-v1:OpenedX%2BDemoX%2BDemoCourse`). `master` decodes it in a wrapper around the
  course routes, which #2195 brings back as a layout route and checks.

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
- The page content starts left of the header, masquerade bar and course tabs, where on
  `master` all four line up. Cause: the frame's content wrapper in `LoadedTabPage` keeps
  `master`'s `container-xl`, which Paragon 23.23.1 caps at 1600px from a 1200px viewport,
  while the shell's `DesktopLayout`, `MasqueradeBar` and `CourseTabsNavigation` use
  Paragon's `<Container fluid size="xl">` (`container-fluid container-mw-xl`), capped at
  1440px plus the 24px gutter. Both pad 12px, so they line up below a 1464px viewport and
  diverge above it, by up to 68px. On `master` the header's course tabs and
  `InstructorToolbar` used `container-xl` too. Fixed by decision log entry 34: the frame's
  wrapper is Paragon's `Container size="xl"`, and #2221's stubs take the same container.
- With the horizontal edges lined up, the gap between the course tabs and the "Important
  dates" heading is smaller than on `master`. Cause: `master`'s `CourseTabsNavigation`
  wraps the tabs in `<div id="courseTabsNavigation" className="mb-3 course-tabs-navigation">`,
  so every tab page starts 1rem below the bar before the heading's own `my-3`; the shell's
  course bar (a Paragon `Navbar` with `course-tabs-navigation pb-0`) sets no bottom margin,
  so the gap is the heading's 1rem alone, where `master`'s is 2rem. Fixed by decision log
  entry 35: the frame's `Container` takes `mt-3`.
- Course not started, first try: with the course's start date set in the future, the dates
  path rendered the timeline with the course start date ahead, and did not redirect.
  Which user, and the metadata response's `course_access`, were not recorded; the
  LMS grants a not-started course's access to staff, to a masquerading user unless
  `ENFORCE_MASQUERADE_START_DATES` is on, when `DISABLE_START_DATES` is set, and when
  `COURSE_PRE_START_ACCESS_FLAG` is on (`check_course_open_for_learner`,
  `check_start_date` in `lms/djangoapps/courseware/access_utils.py`).
