# Manual testing — courseware Redux slice teardown (#1976, layer B)

In-browser verification for the teardown, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX). This is the plan's full
B smoke matrix: the container now derives everything from route params and
queries, the redirect rules run on booleans, and the `courseware` reducer is
gone from the store.

## Verify by hand

- [x] **Unit page loads** — open a unit: page chrome + content render; no
  console errors; Redux DevTools (if open) shows no `courseware` slice.
- [x] **Resume redirect** — open `/course/{courseId}`: lands on the
  last-active (or first) unit.
- [x] **Section URL** — open `/course/{courseId}/{sectionId}`: redirects to
  the section's first sequence, then its unit.
- [x] **Unit-id-as-sequence URL** — open `/course/{courseId}/{unitId}`:
  spinner, then lands on `/course/{courseId}/{sequenceId}/{unitId}` (the 422
  → parent-lookup path).
- [x] **Invalid sequence id** — open `/course/{courseId}/{garbage-id}`:
  bounces to the course root and resumes (this exercises the stale-bail fix —
  the old code could hang here after in-app navigation).
- [x] **`/first` and `/last` markers** —
  `/course/{courseId}/{sequenceId}/first` and `/last` land on the first/last
  unit.
- [ ] **Sequence-position save** — navigate between units in a sequence with
  `save_unit_position` enabled (or just verify no errors on unit navigation).
- [x] **Course-end page** — renders with recommendations/footnote as before.
- [ ] **Denied learner** — masquerade as (or use) a learner without access:
  course-home tabs and courseware redirect per the access rules.
- [x] **Preview route** — a unit under `/preview/course/...` loads; redirects
  keep the `/preview` prefix (resume, section, first/last).

## Results

8 of 10 checks pass against tutor local (DemoX), including the full redirect
matrix (resume, section, unit-as-sequence, invalid-id stale-bail fix,
`/first`/`/last`, preview prefix). Not exercised: **sequence-position save**
(needs `save_unit_position` enabled on a sequence) and **denied learner**
(needs a restricted-access account/course).
