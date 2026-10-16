# Manual testing — dates and outline tab reads onto their queries (#2083)

In-browser verification against a live backend (tutor dev). This layer moves
seventeen readers off the model store onto `useDatesTabData` / `useOutlineTabData`,
so the claim is **no user-visible change** on either tab — but unlike #2091 the
data source really does move, so every reader is worth a look.

Two things are specific to this layer and are the highest-value checks:

- the two **cross-tab alert hooks** now read with `enabled: false`, so they must
  keep working *without* causing an outline-tab request on other tabs;
- the **access-expiration masquerade banner** still reads
  `useModel(tab, courseId)`, which is why the `dates`/`outline` bridge entries
  stay until #1999 — dropping them broke this in tests, so it wants a live check.

## Setup

Same Personalized Learner Schedules arming as #2091 — see the Setup section of
`manual-testing-2091.md` for the full recipe (self-paced course with a graded
subsection, `course_experience.relative_dates` on, a relative due date written
to edx-when, and the learner's `Schedule.start_date` backdated). Re-arm between
runs with the one-liner there; clicking "Shift due dates" resets it.

Masquerade checks need a staff user on the course (masquerade bar → "Specific
student") and a learner whose access has expired.

## Verify by hand

### Already covered on this branch

The suggested-schedule banner checks were run on **this** branch (`#2083`
applied) on 2026-09-21, before being repeated against #2091 alone:

- [x] **Shift-dates banner renders on the dates tab.**
- [x] **Shift-dates banner renders on the outline tab.**
- [x] **Its button still resets deadlines** — toast appeared and the dates had
      moved forward, confirmed by navigating between pages and refreshing.
- [x] **Neither banner renders where it shouldn't** — instructor-paced course,
      or self-paced with no missed deadlines.
- [x] **No new console noise.**

### Specific to this layer

- [x] **No outline request off the outline tab** — with the Network tab open and
      filtered to `course_home/outline`, load a **unit page (courseware)** and
      the **dates** and **progress** tabs directly (hard reload on each, not
      navigated-into). There must be **no** request to
      `/api/course_home/outline/<courseId>`. Courseware matters most here:
      `CoursewareContainer` renders `TabPage` → `LoadedTabPage` like any tab, so
      `useEnrollmentAlert` / `useLogistrationAlert` run on every unit page. This
      is their `enabled: false` read; before this layer they took the model store
      and fetched nothing.
      (Live needs extra setup and discussions renders a separate app, so neither
      is worth standing up for this — they run the same two hooks through the
      same `LoadedTabPage`.)

- [x] **One request per tab, not two** — same filter, load the **outline** tab:
      exactly **one** GET to `/api/course_home/outline/`. Then the **dates** tab:
      exactly one to `/api/course_home/dates/`. Before the `enabled: false`
      readers this was two apiece, because every reader mounted after the tab's
      query had resolved and refetched at `staleTime: 0`.
- [ ] **Enrollment alert still appears** — as an authenticated, *unenrolled*
      learner on a private course, the enrollment alert renders on the outline
      tab.
- [x] **Logistration alert still appears** — same course while **logged out**:
      the "sign in to enroll" alert renders.
- [ ] **Cross-tab behaviour is unchanged** — visit the outline tab first, then
      navigate to the dates tab: the enrollment/logistration alerts behave
      exactly as they did before (they read whatever the outline query already
      cached; they must not start fetching it). *Not run.*
- [ ] **Access-expiration masquerade banner** — as staff, masquerade as a
      specific learner whose access has expired, on both the **outline** and
      **dates** tabs: the "this learner no longer has access…" banner renders.
      This is the reader that keeps the bridge alive; if it is blank, the
      `meta` entries are wrong.

### Outline tab readers (twelve converted sites)

- [x] **Section outline** — sections render, expand/collapse works, sequence
      titles link into courseware, **due dates** show on sequences
      (`SequenceDueDate` reads `userTimezone` off the query now), completion
      checkmarks render.
Each widget is an independent reader, so a failure in one points straight at its
converted read — the field it takes off the query is named for that reason.

- [ ] **Welcome message** (`welcomeMessageHtml`) — the course-updates banner
      renders, "Show More"/"Show Less" toggles it, and dismissing hides it.
      (Dismissal is local state plus a fire-and-forget POST, unchanged here.)
- [x] **Course dates widget** (`datesWidget.courseDateBlocks`, `datesTabLink`) —
      the date list renders in the sidebar and the "All dates" link points at
      the dates tab.
- [ ] **Course handouts** (`handoutsHtml`) — renders when the course has
      handouts configured. This is the one reader that renders `null` rather
      than throwing when the field is absent, so an unconfigured course proves
      nothing; note it as unreachable if yours has none.
- [x] **Course tools** (`courseTools`) — the tools list renders, including the
      bookmarks link and the "Launch tour" button.
- [x] **Start/Resume card** (`resumeCourse.hasVisitedCourse`, `.url`) — the card
      renders, its label reads "Start course" before any visit and "Resume
      course" after one, and the button navigates into courseware.
- [ ] **Outline alerts** — certificate status, course end, private course, and
      scheduled content alerts each render when their course state calls for it
      (check whichever your course surfaces; note the ones it can't).

### Dates tab readers

- [x] **Timeline** — date blocks render, grouped by day, with today's marker.
- [ ] **Upgrade-to-complete alert** — the `BannerDatesUpgradeSlot` default child
      now reads the dates query directly. Needs content-type gating and a
      verified upgrade link; note it as unreachable if the course has neither.

### Failure path

- [ ] **Denied learner on the outline tab** — a learner without access: the
      outline endpoint 403s and `getOutlineTabData` returns `{}`, so every
      converted reader sees an empty payload. The page must render the denial
      (or redirect) rather than crashing — the #1997 regression class, worth
      re-checking because this layer typed the outline data as all-optional.
      If it *does* crash, the error should now read
      `Section "<title>" rendered without outline data for <courseId>` from
      `Section`'s guard, not `Cannot destructure property 'sequences' of
      undefined` — same component, same moment, better message.

## Results

Env: tutor dev, `course-v1:OpenedX+PD1+PD1_1`, user `tutorsuper`, branch
`bsmith/dates-outline-query-reads` @ `dfd507ce`.

**Verified.** Both request-shape checks passed, which are the two claims this
layer makes that nothing else could confirm: no `course_home/outline` request on
a unit page or the dates/progress tabs, and exactly one request per tab on
outline and dates where there were two before the `enabled: false` readers. The
section outline, course dates widget, course tools, start/resume card and dates
timeline all render as before, as do the suggested-schedule banners (checked
earlier on this branch), and the logistration alert still appears for a
logged-out learner on a private course.

**Not run**, each for want of the course state it needs, and resting on the
automated suites:

- enrollment alert (authenticated but unenrolled on a private course)
- access-expiration masquerade banner
- welcome message, course handouts (neither configured on PD1)
- the four outline alerts (certificate status, course end, private course,
  scheduled content)
- upgrade-to-complete alert (needs content-type gating and a verified upgrade
  link)
- denied-learner failure path

**One observation, explained.** During this pass the past-due banner appeared on
the dates tab and in the unit, but not on the outline tab. That is pre-existing
gating, not a regression: the two tabs compute `hasDeadlines` from *different*
lists — `OutlineTab` from `datesWidget.courseDateBlocks`, the sidebar's short
window of upcoming dates, and `DatesTab` from the full `courseDateBlocks`. An
assignment whose due date falls outside that window gates the banner out on the
outline tab only. (The in-unit banner is the LMS's own, from `vert_module.html`,
unrelated to either.) This layer changed where those lists are read from, not the
gates, and the banner did render on the outline tab in the earlier pass on this
same branch.
