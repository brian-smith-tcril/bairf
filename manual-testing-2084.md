# Manual testing — take tab identity out of the course-home metadata query (#2084)

In-browser verification against a live backend (tutor dev). The claim is **no
user-visible change at all** — including request counts, which were measured and are
unchanged (see below). Earlier drafts of this doc claimed the layer saved a request;
that was wrong.

Worth knowing while testing: the **tab bar is not** a client-side path.
`CourseTabLink` renders a plain `<a href>` with a server-supplied absolute URL, so
every tab click is a full page load that discards the cache. The two client-side
crossings are a **sequence title on the outline** (`SequenceTitle` renders a router
`Link` into courseware) and the **home breadcrumb in courseware**
(`CourseBreadcrumbs` links back to `/home`).

Two things are specific to this layer and carry the most risk:

- **the nav highlight** is the whole point of the change. `isActiveTab` replaces a
  payload that was pre-stamped per page, so the Course tab being lit on *both* root
  pages — and not lit anywhere else — is the check that matters most;
- **every deep link built from a tab's `url`** now comes from an accessor rather
  than an inline `find`. Those are spread across five components and several are
  only reachable in awkward course states, so they are listed individually below.

Nothing here is type-checked: `useModel('courseHomeMeta')` returns `any`, so a
missed reader compiles and passes CI. The fixtures were corrected for that reason,
but a live click is the only real proof.

## Setup

An ordinary course is enough for most of it — one with **dates**, **progress** and
**discussion** tabs enabled, plus at least one LMS-hosted tab (**wiki** or
**instructor** as staff) to confirm entries this MFE does not route still render.

Harder states, each needed by exactly one check:

- **Hidden-after-due link** — a subsection with "hide after due date" set and a due
  date in the past.
- **Certificate not-passing alert** — a course that has ended where the learner has
  a failing grade, in a verified-style mode.
- **Course exit pages** — `/course/:courseId/course-end`, reachable by completing
  the course (in progress vs non-passing give different buttons).

## Verify by hand

### The nav highlight (the core of this layer)

- [x] **Course tab is highlighted on the outline** — `/course/:courseId/home`.
- [x] **Course tab is highlighted on courseware** — any unit page. Before this
      layer these were two different cache entries stamped with different values;
      now one entry serves both and `isActiveTab` does the work.
- [x] **Course tab is *not* highlighted on other tabs** — dates, progress,
      discussion, live. Only the tab you are on is lit.
- [x] **Each other tab highlights on its own page** — dates on dates, progress on
      progress, and so on.
- [x] **The highlight is correct after client-side navigation** — from the outline,
      click a **sequence title** to enter courseware, then the **home breadcrumb**
      back. The nav unmounts and reappears each way (`TabPage` shows a loading state
      while the courseware queries resolve), so this is not a continuity check: it is
      that the Course tab is highlighted once each page settles. These are the only
      two transitions that reuse the cache, so they are the only ones where a stale
      cached value could show through.

### The page title

- [x] **Helmet title carries the tab name** on the outline and on courseware
      (both should read "Course | …"), and on dates/progress ("Dates | …").
      This is `getActiveTabTitle`, which now returns the string rather than the tab.

### Request count — measured, no difference

Protocol: hard reload the outline, wait for the Network tab to go idle, clear the
log, click a **sequence title**, wait for idle again, count `course_metadata`. The
last wait matters — cutting it short undercounts, which is what produced some
inconsistent early readings.

Result: **exactly 3, five runs each, on this layer and on `4750d1fc` (#2093)**. No
variance on either side. Three hits because fetching observers under
`CoursewareContainer` mount after its fetch has settled and refetch the stale entry.
#2098 traced the extra two to `UnitNavigation` and `UnitNavigationEffortEstimate`,
through `useSequenceIds`; there is no remount across the redirect.

- [x] **No measurable change in request count.** The layer does not reduce requests
      and should not claim to. `useCourseHomeMeta` sets no `staleTime`, so a shared
      key still refetches for every observer that mounts on a stale entry;
      collapsing two keys into one turns a cache miss into a stale hit rather than
      removing a fetch.
Not worth checking: whether the crossing feels faster. `TabPage` gates on
`useIsCourseLoaded`, which requires `useCoursewareMetadata`, `useCoursewareOutline`
**and** `useCourseHomeMeta` to succeed. This layer turns the third from a cache miss
into a stale hit, so it stops holding the spinner — but the first two are misses on
that crossing regardless, since the outline page never fetches them. One fewer
blocker out of three, where the other two still block, is not observable.

### Links built from a tab's url

- [x] **Progress tab → "Course outline"** in Related Links resolves to
      `/course/:courseId/home`. (`getCourseOutlineUrl`)
- [x] **Progress tab → "Dates"** in Related Links resolves to the dates tab.
      (`getDatesTabUrl`)
- [x] **Progress tab → "Course outline" link in the ungraded note** — the line
      reading *"For progress on ungraded aspects of the course, view your Course
      outline."* below the grades table; its inline link resolves. Renders only when
      `showUngradedAssignments()` is false. (`getCourseOutlineUrl` in
      `DetailedGrades`)
- [x] **Hidden-after-due alert → "progress page"** link resolves to the progress
      tab. (`getProgressTabUrl`) — **the one worth setting up**, because it is the
      only live check of `getProgressTabUrl` and the cheapest state to reach. Set it
      up entirely in the authoring MFE: **Course outline → subsection → Configure →
      Visibility**, middle radio option. On an **instructor-paced** course that reads
      "Hide content after due date" and needs a subsection **due date in the past**
      (Basic tab of the same modal); on a self-paced one it reads "Hide content after
      end date" and keys off the course end date instead. View as a **learner** —
      staff bypass the check entirely, and masquerading as a *specific* student
      deliberately shows the content with a banner rather than hiding it, so use the
      generic Learner role or a real learner account.

      If the alert does not appear, check `is_hidden_after_due` in the
      `/api/courseware/sequence/<usage key>` response — that is exactly what
      `Sequence.jsx:161` branches on, and `false` means the course config is not
      taking effect rather than the MFE being wrong.

Deliberately skipped — each is a repeat call site of an accessor already confirmed
above, in a state that costs a lot to reach. With the hidden-after-due check done,
every accessor has a live confirmation: `getCourseOutlineUrl` and `getDatesTabUrl`
from Related Links, `getProgressTabUrl` from the hidden-after-due alert.

- [ ] ~~Certificate not-passing alert → "view grades"~~ (`getProgressTabUrl`) —
      needs enrolled + a verified-family enrollment mode + course ended + not passing
      + no alerting cert status. *Not run.*
- [ ] ~~Course exit (in progress) → "view course schedule"~~ (`getDatesTabUrl`) —
      needs `hasScheduledContent && !userHasPassingGrade` and the course-end page.
      *Not run.*
- [ ] ~~Course exit (non-passing) → "view grades"~~ (`getProgressTabUrl`) — needs
      `isEligibleForCertificate && !userHasPassingGrade && canImmediatelyViewCertificate`.
      *Not run.*

### Discussions

- [x] **Discussion topics still prefetch** — with `DISCUSSIONS_MFE_BASE_URL` set
      and the course using built-in discussions, open a unit and confirm the
      discussions sidebar works as before. This gate lost its `edxProvider` local
      and is now `hasDiscussionTab(course?.tabs)`; it had no test at all before
      this layer, so a live check is worth more here than elsewhere.
- [x] **A course with discussions disabled** still loads units with no errors and
      no discussion topics request.

### Tabs this MFE does not route

- [x] **LMS-hosted tabs still render and navigate** — checked with **Teams**.
      Clicking it leaves the MFE entirely for the LMS teams page, which renders its
      own tab bar matching the one the MFE shows, and every tab there navigates to
      the right place.

      Stronger than the check was aiming for: both sides render from the same
      `get_course_tab_list`, so matching tab sets and working links confirm the URLs
      round-trip correctly rather than only that ours render. Teams also exercises
      `getActiveTabTitle` tolerating an id this MFE has never heard of.

      (Teams is the easiest subject — `TeamsTab` is an `EnrolledTab` with
      `view_name = "teams_dashboard"`, so it reverses to an LMS route and needs no
      staff account. Wiki or instructor work too.)

### Plugin links

- [x] **A slot-inserted `CourseTabLink` still renders and highlights as coded.**
      Checked with a temporary `env.config.jsx` inserting links into
      `org.openedx.frontend.learning.course_tab_links.v1`. They render in the nav,
      the real tabs are unaffected, and `activeTabSlug` reaches the widget as before.
      This layer changes nothing about the slot's props or `CourseTabLink`.

### General

- [ ] **No new console noise** on any of the above. *Not run — the MFE is noisy
      enough at baseline that a small addition would not be distinguishable without
      a before/after capture, which was not worth setting up for this layer.*
