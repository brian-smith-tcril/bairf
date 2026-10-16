# Manual testing — read sequences from the courseware queries, not `useModel` (#2088, layer B)

In-browser verification against a live backend (tutor dev).

What changed: the eleven readers of the `sequences` model read the active
sequence from the sequence query and other sequences' `id` / `title` /
`sectionId` from the outline query; the position writer patches the cached
sequence instead of the store; the three `sequences` store selectors in
`CoursewareContainer` and `redirects.ts` read the cache; neither query writes
the `sequences` model any more. No request change intended.

**The bugs this layer could introduce.** (1) *A reader on the wrong query* —
a field read from the query that does not carry it is `undefined`: a missing
section crumb or entrance-exam alert (`sectionId`), a missing next-sequence
title, a sequence rendered as gated or hidden when it is not. (2) *The
position round trip* — the save writes the cache and the bare-sequence
redirect reads it; if either missed, `/course/{c}/{seq}` would land on the
unit fetched at page load instead of the last one visited. (3) *The
rollback* — a failed `goto_position` POST should put the cached position
back. (4) *Navigation at the edges* — previous/next across a sequence
boundary and the first/last-unit disabling read `unitIds` from the sequence
query and the sequence list from the outline.

## Setup

A course with two or more sections of several sequences each, some with
several units; a sequence with a banner text; a prerequisite-gated sequence,
a timed exam and a hidden-after-due sequence if available. Devtools Network
filtered to `courseware/sequence|goto_position`, Console open.

## Checks

### Request count (unchanged)

- [x] **Hard-reload a unit, wait for idle:** `api/courseware/sequence/{id}` **1**; navigate within the sequence: no new one.

### Readers (bug 1)

- [x] **Sequence renders:** unit content, top and bottom unit navigation with the unit tabs.
- [ ] **Breadcrumbs:** section and sequence crumbs with the right titles; jump nav (staff, `ENABLE_JUMPNAV`) lists the section's sequences.
- [x] **Page title:** the tab reads "{sequence} | {section} | {course} | {site}" once loaded.
- [ ] **Banner text alert:** on the sequence with a banner, the info alert shows.
- [ ] **Entrance exam (if configured):** the entrance-exam alert shows on the exam section's sequences and nowhere else.
- [ ] **Prerequisite-gated sequence (if available):** "Content Locked" with the prerequisite's name; lock icon in the unit navigation.
- [ ] **Hidden-after-due (if available):** the notice renders.
- [ ] **Timed exam (if available):** the exam start screen renders.
- [ ] **First-section celebration (if the course is fresh for the learner):** completing the last unit of the first section and moving on shows the celebration once.

### Navigation (bug 4)

- [x] **Previous/next across a sequence boundary:** next from the last unit lands on the next sequence's first unit; previous from a first unit lands on the previous sequence's last unit.
- [x] **Edges:** previous is disabled on the course's first unit; next on the last unit reads the end-of-course text.
- [ ] **`/course/{c}/{seq}/first` and `/last`:** land on that sequence's first and last unit.

### Position round trip (bugs 2 and 3)

- [x] **Saved position drives the bare URL:** open a sequence's first unit, navigate to its third unit (one `goto_position` POST with `position: 3`), then load `/course/{c}/{seq}` in the same session (breadcrumb, or edit the URL and press enter): it lands on the third unit.
- [x] **Rollback:** block `goto_position` in devtools, navigate to another unit in the sequence, then open `/course/{c}/{seq}`: it lands on the previously saved unit, not the blocked one; the console shows the logged error.
- [x] **Console:** no error naming `useSequenceMetadata`, `useMinimalCourseOutline`, `useSaveSequencePosition` or `logSequenceEvent`.

## Results

Run 2026-09-27 on tutor dev, after the rebase onto #2131. 9 of 17 checks
run, all passing.

**Run**

- **Request count:** one `api/courseware/sequence/{id}` request per hard
  reload; none on navigation within the sequence.
- **Sequence renders; page title:** unit content and both unit navigations
  rendered; the tab title carried the sequence, section, course and site
  names once loaded.
- **Previous/next across a sequence boundary; edges:** next from a last
  unit landed on the next sequence's first unit and previous from a first
  unit on the previous sequence's last; previous disabled on the course's
  first unit, the end-of-course text on the last.
- **Saved position drives the bare URL:** after navigating to a sequence's
  third unit (one `goto_position` POST), `/course/{c}/{seq}` landed on the
  third unit.
- **Rollback:** with `goto_position` blocked, moving to another unit and
  reopening `/course/{c}/{seq}` landed on the previously saved unit, with
  the error logged to the console.
- **Console:** no error naming the layer's hooks.

**Not run**

- Breadcrumbs and the jump nav (the same outline read as the page title,
  which passed; the breadcrumb suite covers the section's sequences).
- Banner text, entrance exam, prerequisite-gated, hidden-after-due, timed
  exam and the first-section celebration (no such content in the test
  course; each reader is covered by its suite against the real query or a
  mocked `useSequenceMetadata`).
- `/first` and `/last` (the redirect suite's resume cases cover the rule).
