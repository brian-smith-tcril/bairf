# Manual testing — read the redirects and container from the courseware queries, not the model store (#2089, layer B)

In-browser verification against a live backend (tutor local).

What changed: `useCoursewareRedirects` reads the sections and the first section
from the outline query instead of the model store, `CoursewareContainer` reads the
first-section celebration flag from the courseware metadata query, and the two
queries stop mirroring into the store. No request change intended.

**The bugs this layer could introduce.**
- *A redirect rule fed the wrong input.* A section-shaped URL, a unit id in the
  sequence slot, or the course root landing somewhere else, or not redirecting.
- *A rule firing before the outline has loaded.* A redirect on a hard reload
  before the outline lands, to the wrong place or in a loop.
- *The first-section celebration.* Not recorded, or recorded on every sequence
  change.

## Setup

- A course with two or more sections of several sequences each, some with several
  units, and the course exit page active.
- Devtools Network filtered to `courseware/course|course_outline|course_metadata|resume|blocks`,
  Console open.
- **For the pending-outline checks,** a way to delay the outline: an 8 s `sleep` at
  the top of `getLearningSequencesOutline` in `src/courseware/data/api.js`, as for
  #2138; remove it afterwards.
- **For the outline-failure check,** make the outline request fail with a 500 (a
  `throw` in the same place), as for #2139.

## Checks

### Request count (unchanged)

- [x] **Hard-reload a unit, wait for idle:** `api/courseware/course/{id}` **1**, `learning_sequences/v1/course_outline/{id}` **1**, `course_home/course_metadata/{id}` **1**. Navigating within and across sequences sends no new ones.

### Redirect rules

- [x] **Resume, `/course/{courseId}`:** lands on the resume unit (one `api/courseware/resume/{id}` request), or the first sequence's unit for a learner with no resume block.
- [x] **Section → first sequence, `/course/{courseId}/{sectionId}`:** lands on the section's first sequence and its active unit.
- [x] **Section/unit → unit, `/course/{courseId}/{sectionId}/{unitId}`:** lands on that unit under its sequence.

http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse/block-v1:OpenedX+DemoX+DemoCourse+type@chapter+block@30b3fbb840024953b2d4b2e700a53002/block-v1:OpenedX+DemoX+DemoCourse+type@vertical+block@2a1f276a2b964eb6b137ed56abfe9052 -> http://apps.local.openedx.io:2000/learning/course/course-v1:OpenedX+DemoX+DemoCourse/block-v1:OpenedX+DemoX+DemoCourse+type@sequential+block@4e1de5e13fc3422997fe246b40a43aa1/block-v1:OpenedX+DemoX+DemoCourse+type@vertical+block@2a1f276a2b964eb6b137ed56abfe9052

- [x] **Unit → sequence/unit, `/course/{courseId}/{unitId}`:** lands on the unit under its parent sequence (one `api/courses/v2/blocks/` request).
- [x] **Markers, `/course/{courseId}/{sequenceId}/first` and `/last`:** land on the sequence's first and last unit.
- [x] **Outline failure (500):** the courseware page redirects to `/course/{courseId}/home`.

  Observed: the page renders first and the redirect lands about 7 s later — the query client retries a 5xx three times, and while it retries the query is pending, which #2138 decided renders the page. Accepted for the conversion; whether the page needs this request at all is #2145.

### While the outline is delayed (8 s)

- [x] **Course root and a section URL:** the URL does not change until the outline lands, then the redirect above happens once. No `resume` or `blocks` request before the outline lands.

### First-section celebration

- [ ] **A learner who has not yet crossed a section** (`first_section` true in `api/courseware/course/{id}`): on the last unit of the first section, Next moves into the next section and the celebration modal shows on the new page. Moving between sequences within a section shows nothing.


