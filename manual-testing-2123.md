# Manual testing — stop the sequence query refetching from components under the gate (#2123)

In-browser verification against a live backend (tutor dev).

What changed: `useSequenceMetadata` takes `{ enabled }`, and the five
observers under `CoursewareContainer` — `Sequence`, `SequenceNavigation`,
`CourseBreadcrumbs`, the two sequence alerts and
`useSequenceNavigationMetadata` — pass `{ enabled: false }`, so only
`CoursewareContainer` and `useCoursewareRedirects` fetch the sequence
metadata. No reader changes, no data changes; the only intended difference is
the request count.

**The bugs this layer could introduce.** (1) *A component that never sees
the data* — a disabled observer with nothing fetching its query stays
`pending` forever. Every one of the five renders under `CoursewareContainer`,
which fetches, so the sequence, its navigation, breadcrumbs and alerts should
render exactly as before; a spinner that never clears, or a missing
breadcrumb / alert, means that assumption is wrong somewhere. (2) *A stale
sequence* — the owner's refetch on navigating to a new sequence is what
brings in `position`, `complete` and `bookmarked`; if the owner somehow
stopped refetching, the unit navigation would show the previous sequence's
state. (3) *The count did not drop* — an observer was missed, or the second
request comes from somewhere not in the five.

## Setup

A course with at least two sections, each with two or more sequences, some
with several units. One sequence with a banner text and, if available, a
prerequisite-gated sequence and a timed exam. Browser devtools open on the
Network tab filtered to `courseware/sequence`, with the *Initiator* column
visible, and on the Console.

## Checks

### Request count (bug 3) — the #2098 protocol

- [x] **Baseline, on `master` (or the layer below):** hard-reload a unit, wait for the Network tab to go idle: `api/courseware/sequence/{id}` count = **3**. Initiator of each request beyond the first: **___**.
- [x] **On this layer:** same reload: count **1**.
- [x] **Navigate to another unit in the same sequence:** no new `courseware/sequence` request.
- [x] **Navigate to a unit in another sequence (next/previous across the boundary, and via the sidebar):** exactly one request, for the new sequence.
- [x] **Open `/course/{id}/{sequenceId}` with no unit:** one request; the redirect lands on the active unit.

### The components see the data (bug 1)

- [x] **Sequence renders:** unit content loads, the top and bottom unit navigations show the unit tabs and previous/next.
- [ ] **Breadcrumbs:** section and sequence crumbs render; jump nav (staff, `ENABLE_JUMPNAV`) lists the sequences.
- [ ] **Banner text alert:** on the sequence with a banner, the info alert shows above the content.
- [ ] **Prerequisite-gated sequence (if available):** the "Content Locked" panel and the lock in the unit navigation.
- [ ] **Timed exam (if available):** the exam wrapper renders its start screen.
- [x] **Hidden-after-due (if available):** the notice renders.
- [x] **Console:** no error naming `useSequenceMetadata`, `sequenceMightBeUnit` or `MountCourseQueryHooks`.

### Owner still refetches (bug 2)

- [x] **Complete a unit, move to the next sequence and back:** the completion tick on the earlier unit is present after the return (the return is a new sequence fetch).
- [x] **Bookmark a unit, leave the sequence and return:** the bookmark icon is present on the unit tab.

## Results

Run 2026-09-25 on tutor dev. 11 of 15 checks run, all passing; 4 not run.

**Run**

- **Request count:** on the layer below (`bsmith/discussion-topics-query-reads`),
  a hard reload of a unit requested `api/courseware/sequence/{id}` **3**
  times (the jest harness shows 2; a real render mounts more observers after
  the data settles). On this layer the same reload requested it **once**.
  Another unit in the same sequence: no new request. A unit in another
  sequence, by next/previous and by the sidebar: one request, for the new
  sequence. `/course/{id}/{sequenceId}` with no unit: one request, and the
  redirect landed on the active unit. The initiators of the two extra
  baseline requests were not recorded.
- **Sequence renders:** unit content loaded; both unit navigations showed
  the unit tabs and previous/next.
- **Hidden-after-due:** the notice rendered.
- **Console:** no error naming `useSequenceMetadata`, `sequenceMightBeUnit`
  or `MountCourseQueryHooks`.
- **Owner still refetches:** after completing a unit, crossing into the next
  sequence and returning, the completion tick was present; after
  bookmarking a unit, leaving the sequence and returning, the bookmark icon
  was present on its tab.

**Not run**

- **Breadcrumbs / jump nav:** not checked. `CourseBreadcrumbs.test.jsx`
  (4 cases) renders the component under the owner mount this layer added,
  the same shape as production.
- **Banner text alert:** no sequence with a banner in the test course.
  Covered by *renders banner text alert* in `Course.test.jsx`, which renders
  `Course` under the owner mount, so the alert hook's disabled observer is
  exercised.
- **Prerequisite-gated sequence:** none in the test course. Covered by
  *renders correctly for gated content* in `Sequence.test.jsx` and *renders
  locked button for gated content* in `SequenceNavigation.test.jsx`, both
  under the owner mount.
- **Timed exam:** none in the test course. `SequenceExamWrapper` receives
  the `sequence` model from `useModel`, which this layer does not touch, and
  the exam library is mocked in `Course.test.jsx`; not covered by this
  layer's tests either, by design of the layer (no reader change).
