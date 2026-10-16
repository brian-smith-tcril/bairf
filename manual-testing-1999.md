# Manual testing — source the access-expiration masquerade banner from the tab queries (#1999)

In-browser verification against a live backend (tutor local). PR #2153. Run by
the user 2026-10-02 with the three temporary fetcher edits below, then reverted.

What changed: `useAccessExpirationMasqueradeBanner` reads the outline and
progress queries (non-fetching, keyed by the toolbar's `tab`) instead of the
`useModel(tab, courseId)` mirror, and the three tab-data queries stop writing
the model store. The banner should render exactly where it did (Course and
Progress tabs, while masquerading as a learner whose access has expired) and
nowhere else; no request count changes.

**The bugs this layer could introduce.**
- *The banner missing on Progress for a specific learner.* The hook's progress
  key now includes `targetUserId` from the route; a mismatch with the owner's
  key reads an empty cache entry and hides the banner on `/progress/<id>`.
- *The banner appearing in courseware.* The courseware metadata carries the
  same flag; the tab-keyed lookup must keep ignoring it.
- *An extra request.* Two new `enabled: false` observers mount with the
  toolbar on every tab; neither may fetch.

## Setup

The banner needs `access_expiration.masquerading_expired_course: true` in the
outline and progress payloads. Producing that for real is the platform's FBE
access-duration feature (config row, verified mode, backdated audit enrollment,
specific-student masquerade; appendix below), which this layer does not touch.
Fake it in the fetchers instead, **after** the real request so the Network
counts stay real; remove all three edits afterwards (`git diff` empty).

```ts
// temporary, manual test only
const expiredAccess = {
  expiration_date: '2020-01-01T12:00:00Z', masquerading_expired_course: true,
  upgrade_deadline: null, upgrade_url: null,
};
```

- `src/course-home/data/api.ts`, `getOutlineTabData`: after `const { data, headers } = tabData;`
  add `data.access_expiration = expiredAccess;`.
- `src/course-home/data/api.ts`, `getProgressTabData`: before `const camelCasedData = camelCaseObject(data);`
  add `data.access_expiration = expiredAccess;`.
- `src/courseware/data/api.js`, `getCourseMetadata`: before `return normalizeCoursewareMeta(metadata);`
  add `metadata.data.access_expiration = expiredAccess;` (for the "must not render in courseware" check).

Then:

1. Log in as a staff user so the instructor toolbar renders. No masquerade
   needed: the flag is in the payload.
2. Devtools Network filtered to `course_home|courseware/course`, Console open.

## Checks

### Where the banner renders

- [x] **Course (outline) tab:** the warning "This learner no longer has access to this course. Their access expired on 1/1/2020." in the instructor toolbar.
- [x] **Progress tab:** same banner.
- [x] **Progress tab via `/progress/<any learner id>/`:** same banner (the new keyed read; the progress request URL changes, and the hook must read that entry).
- [x] **Temporary edits removed, hard reload:** banner gone on both tabs.

### Where it must not render

- [x] **Dates tab:** no banner.
- [x] **Courseware (a unit):** no banner. The courseware metadata carries the same flag (the third temporary edit), and the hook must ignore it.

### Request count (unchanged)

- [x] **Hard-reload the outline tab as staff, wait for idle:** `course_home/outline/<id>` **1**, `course_home/progress/` **0**.
- [x] **Hard-reload the progress tab as staff, wait for idle:** `course_home/progress/<id>` **1**, `course_home/outline/` **0**.
- [x] **Hard-reload the dates tab as staff:** `course_home/dates/<id>` **1**, no outline or progress request.

### Console

- [x] No errors or warnings on any of the above beyond those present on master.

## Appendix: producing the flag for real

Only if a real-data pass is ever wanted. `get_user_course_expiration_date`
(`openedx/features/course_duration_limits/access.py`) returns a date when all
hold: `CourseDurationLimitConfig` enabled with *Enabled as of* before the
enrollment (`/admin/course_duration_limits/coursedurationlimitconfig/`); a
`verified` mode on the course (`/admin/course_modes/coursemode/`, expired
deadline fine); the learner enrolled as `audit`; and `max(enrollment.created,
course.start)` plus the expected duration in the past, so backdate
`CourseEnrollment.created` a year in the LMS shell and the course start in
Studio. `masquerading_expired_course` is true only for a *specific-student*
masquerade (`is_masquerading_as_specific_student`), not "Learner". Diagnose
from `/api/course_home/outline/<courseId>` as the learner.
