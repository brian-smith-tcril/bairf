# Manual testing — read sections and coursewareMeta from the courseware queries, not `useModel` (#2089, layer A)

In-browser verification against a live backend (tutor local).

What changed: the readers of the `coursewareMeta` and `sections` models read the
query that owns each field. That's the courseware metadata query for the metadata,
and the learning-sequences outline query for the course entry (`title`,
`sectionIds`, `hasScheduledContent`) and its sections. The integrity-signature
writer patches the cached metadata, and the course title comes from the outline
everywhere. The sidebar asks every widget with whatever is loaded, and
`useSequenceIds` reads through `useCourseSections`. No request change intended.

**The bugs this layer could introduce.**
- *A reader on the wrong query.* A field read from the query that doesn't carry it
  is `undefined`: a missing crumb, a wrong course-end mode, a paywall or upgrade
  panel without its dates or offer, social icons missing.
- *The title source.* The page title or the course-end page's title could come
  from the wrong place, or show the metadata's HTML-escaped name.
- *The sequence list.* Navigation across a sequence boundary, or the last unit's
  Next, is wrong if `useSequenceIds` returns the wrong ids.
- *Widget availability.* A sidebar widget missing, or shown when it shouldn't be.
- *The integrity-signature write.* The honor code prompt doesn't go away after
  agreeing, or comes back.

## Setup

- A course with two or more sections of several sequences each, some with several
  units, and the course exit page active.
- **For the title check,** a course display name containing `&`, e.g. "R&D Demo".
  Change it in Studio's **Advanced settings**, **Course display name**, and publish.
- `env.config.jsx` inserting `CourseBreadcrumbs` into the breadcrumbs slot, as for
  #2139.
- **Optional, where the instance supports them:**
  - an audit learner in a course with a verified mode (upgrade widget, paywall);
  - discussions configured (discussions widget);
  - integrity signature enabled (honor code);
  - an entrance exam.
- Devtools Network filtered to `courseware/course|course_outline|course_metadata`,
  Console open.

## Checks

### Request count (unchanged)

- [x] **Hard-reload a unit, wait for idle:** `api/courseware/course/{id}` **1**, `learning_sequences/v1/course_outline/{id}` **1**, `course_home/course_metadata/{id}` **1**. Navigating within and across sequences sends no new ones.

### Title source (#2137)

- [x] **Courseware page title:** "{sequence} | {section} | R&D Demo | {site}", with `&` and not `&amp;`.
- [ ] **Course-end page title:** the course-end page's tab title shows "R&D Demo" unescaped.

### Readers

- [x] **Breadcrumbs:** section and sequence crumbs with the right titles. As staff, the jump nav lists the section's sequences.
- [x] **Sequence navigation:** Previous and Next move within a sequence, and across a sequence and a section boundary. The first unit's Previous is disabled. The last unit's Next goes to `/course/{courseId}/course-end` when the exit page is active.
- [x] **Outline sidebar:** opens, lists the sections and sequences, and navigates.
- [x] **Course-end page:** the learner's mode is the same as on `master`: celebration, not passing, in progress, or the redirect for `disabled`.
- [x] **Celebration page (a passing learner):** renders its sections. If the course has a marketing URL, the social share icons show.
- [ ] **Progress tab:** the certificate status section is the same as on `master`.

### Optional readers (where the instance supports them)

- [ ] **Upgrade widget (audit learner, verified mode):** the upgrade trigger shows in the sidebar, and the panel renders with its upgrade details.
- [ ] **Paywall (audit learner, gated unit):** the lock paywall renders with its upgrade link and, if the course has one, its offer.
- [x] **Discussions widget:** its trigger shows on a unit with a discussion topic, and not on one without.
- [ ] **Honor code (integrity signature enabled):** the honor code prompt shows on a graded unit. After agreeing it goes away and doesn't come back when you move between units.
- [ ] **Entrance exam:** the entrance-exam alert shows on the exam section's sequences. Until the exam is passed, the outline sidebar and its trigger don't render; once it's passed, they do.
