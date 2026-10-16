# Manual testing — stop the courseware gate queries refetching from components under the gate (#2098)

In-browser verification against a live backend (tutor dev).

What changed: `useIsCourseLoaded` no longer fetches, and neither does
`useSequenceIds`, which reads through it. `CoursewareContainer` (together with
`useCoursewareRedirects`, which it calls) is now the only thing fetching the three
gate queries — `/api/course_home/course_metadata/`, `/api/courseware/course/` and
`/api/learning_sequences/v1/course_outline/`. Everything below it only reads.

**The bug this layer could introduce is a reader that never sees loaded data.** A
disabled observer with nothing fetching its query stays `pending`, so the gate reads
`false` forever and the component sits in its "not loaded yet" state without
erroring. That is what this doc is mostly for: click through every page and every
component that now only reads, and confirm each behaves as if the course is loaded.
In the app nothing should be in that position — every reader renders under
`CoursewareContainer` — so any failure here means that assumption is wrong somewhere.

What "stuck unloaded" looks like, per reader:

| reader | reads | stuck unloaded, you would see |
|---|---|---|
| `CourseBreadcrumbs` (slot-inserted, see Setup) | `useIsCourseLoaded` | breadcrumbs with no section/subsection crumbs or empty dropdowns |
| `useSequenceNavigationMetadata` → `UnitNavigation` (beside the unit title and at the bottom, by default) and `SequenceNavigation` (the unit-tab bar, slot-inserted) | `useIsCourseLoaded`, `useSequenceIds` | Previous/Next never disabled at the course's ends, no link to the course-end page, and cross-sequence Next/Previous going nowhere |
| `useSequenceNavigationMetadata` → `useIFrameBehavior` | same | video auto-advance doing nothing at the end of a video (not run; see *Not covered*) |
| `UnitNavigationEffortEstimate` (inside Next) | `useSequenceIds` | nothing visible — its effort branch is unreachable today (AA-930) and it passes its children through |
| `CoursewareContainer` itself | `useSequenceIds` | the first-section celebration not being queued when Next crosses out of the first section (not run; see *Not covered*) |
| `useCoursewareRedirects` | `useIsCourseLoaded` | a partial courseware URL that never redirects to a unit |

## Setup

An ordinary course with **several sections**, each with a few subsections and
units, covers most of it. Test as an **enrolled learner** unless a check says
otherwise.

**Two of the readers render only when a plugin slot inserts them**, so add both to
`env.config.jsx` (it is untracked — check a stale local copy is not carrying other
overrides). Both inserts are the "Replace with default … component" examples from the
slots' READMEs:

- `org.openedx.frontend.learning.course_breadcrumbs.v1` — `CourseBreadcrumbsSlot`
  renders nothing by default; insert `CourseBreadcrumbs` from
  `./src/courseware/course/breadcrumbs`, passing through `courseId`, `sectionId`,
  `sequenceId`, `unitId` and `isStaff` (`src/plugin-slots/CourseBreadcrumbsSlot/README.md`).
- `org.openedx.frontend.learning.sequence_navigation.v1` — `SequenceNavigationSlot`
  also renders nothing by default (`Sequence.jsx` says so above it); insert
  `SequenceNavigation` from `./src/courseware/course/sequence/sequence-navigation`
  as in `src/plugin-slots/SequenceNavigationSlot/README.md`.

Without them, the breadcrumb checks and the unit-tab bar checks below have nothing
to look at. The two `UnitNavigation` instances render by default.

Extra state for one check:

- **Preview route** — a staff account, to open a unit through
  `/preview/course/:courseId/:sequenceId/:unitId` (e.g. *Preview* from the authoring
  MFE).

## Verify by hand

### Entering courseware

Each of these mounts the readers in a different order relative to the owner's fetch.

- [x] **From the outline**, click a sequence title. The unit renders, breadcrumbs
      fill in, the navigation works.
- [x] **Hard reload on a unit URL** (`/course/:courseId/:sequenceId/:unitId`). The
      readers mount while the owner's requests are still in flight, which is the case
      most likely to expose a reader that never updates.
- [x] **`/course/:courseId`** redirects to the resume unit (or the first unit on a
      fresh enrollment) and the page settles as above.
- [x] **`/course/:courseId/:sequenceId`** redirects to a unit in that sequence.
- [x] **A section id in the sequence slot** (`/course/:courseId/<section id>`)
      redirects to that section's first sequence.
- [x] **Home breadcrumb back to the outline, then a sequence title again** — the
      second entry reuses cached data rather than fetching from scratch, and should
      settle the same way.

### Breadcrumbs

- [x] **Section and subsection crumbs show** with the right titles, on first entry
      and after moving to another sequence.
- [x] **The section dropdown lists every section**, and choosing one navigates there.
- [x] **The subsection dropdown lists that section's subsections**, and choosing one
      navigates there.

### Unit navigation

Three navigation surfaces read the same metadata: `UnitNavigation` beside the unit
title, `UnitNavigation` at the bottom of the unit, and the `SequenceNavigation`
unit-tab bar (slot-inserted). Run each check in **all three**.

- [x] **Previous is disabled on the course's first unit**, and enabled on every other
      unit.
- [x] **Next and Previous within a sequence** move one unit.
- [x] **Next on a sequence's last unit** lands on the first unit of the next
      sequence; **Previous on a sequence's first unit** lands on the last unit of the
      previous one. Include a **section boundary**.
- [x] **Next on the course's last unit** goes to the course-end page
      (`/course/:courseId/course-end`), and that page renders.
- [x] **After several of the above**, the bars still reflect the current unit — no
      stale first/last state from a previous sequence.

### Preview route

- [ ] **Open a unit via `/preview/course/…`** as staff: breadcrumbs (with `/preview`
      in their links), the navigation and unit-to-unit movement behave as on the
      normal route.

### Request count

Protocol, same as #2084's: hard reload the outline, wait for the Network tab to go
idle, clear the log, click a **sequence title**, wait for idle again, count each
endpoint.

| endpoint | before (on #2084) | after |
|---|---|---|
| `/api/course_home/course_metadata/` | 3 | 1 |
| `/api/courseware/course/` | 3 | 1 |
| `/api/learning_sequences/v1/course_outline/` | 3 | 1 |
| `/api/course_home/v1/navigation/` (control) | 1 | 1 |

"Before" was measured while diagnosing this issue: `course_metadata` over five runs
(3 every time), the other three once.

- [x] **Each gate endpoint is requested once**, and the control stays at 1.
- [x] **Next across a sequence boundary**: clear the log, click, wait for idle, count
      the three gate endpoints. **0 on this layer.** Not measured on the layer below
      (#2101), so there is no before number to compare against.

### General

- [ ] **No new console errors** on any of the above. *Not verified — nothing stood
      out while testing, but the console was not checked against a before capture.*

Not covered:

- **Video auto-advance.** `useIFrameBehavior` takes `isLastUnit` and `nextLink` from
  the same `useSequenceNavigationMetadata(sequenceId, unitId)` call the navigation
  surfaces use, so the unit-navigation checks above — Next resolving within a
  sequence, across sequence and section boundaries, and to course-end on the last
  unit — exercise the values it would act on. What is specific to it is the video
  block's `plugin.autoAdvance` message, which this layer does not touch. Setting it
  up needs the platform's `ENABLE_AUTOADVANCE_VIDEOS` flag (off by default, and it
  hides the course's *Enable video auto-advance* Advanced Setting while off), the
  course setting, and the learner's player toggle.
- **The first-section celebration.** Its read is `CoursewareContainer`'s own
  `useSequenceIds` call, in the owner's render alongside the fetching
  `useCoursewareMetadata` / `useCourseHomeMeta` calls and `useCoursewareRedirects`,
  so it cannot be left without a fetch the way a component further down could; the
  sequence-boundary Next checks above already show `useSequenceIds` returning the
  loaded sequence list. The modal is also off by default: openedx-platform creates the
  enrollment's celebration row only when the enrollment is created while the
  `courseware.mfe_progress_milestones` course waffle flag is on, and it then needs Next
  from a section's last unit into the next section, with no streak celebration due.
- **The `useIFrameBehavior` invalidation after a `post_event`** (the
"Shift due dates" button in a past-due problem). It refetches through the owner's
observers, which are unchanged by this layer, and producing a missed deadline takes
a self-paced course with the `relative_dates` flag and a backdated schedule. Worth
running only if something above suggests the owner itself is misbehaving.
