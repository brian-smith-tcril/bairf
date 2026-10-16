# Manual testing — retire the `courseHome` Redux slice (#1975 close-out)

In-browser verification against a live backend (tutor local). This layer
claims **no user-visible change**: the proctoring info panel renders the same
content from a query instead of six `useState`s; the weekly-goal card still
waits for the panel to settle; the outline tour still waits for the card; and
the only new observable is that a non-404 failure of the onboarding request is
now logged instead of swallowed.

## Setup (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; outline tab at
`/course/course-v1:OpenedX+DemoX+DemoCourse/home`.

- DemoX has no proctored exams: `enable_proctored_exams` is false in the
  outline payload, so the weekly-goal gate is open regardless of the panel,
  and the onboarding request answers with no proctoring info → panel hidden.
  Tutor local has no `EXAMS_BASE_URL`, so the request is the LMS one:
  `/api/edx_proctoring/v1/user_onboarding/status?is_learning_mfe=true&course_id=...&username=...`
  (with `EXAMS_BASE_URL` it would be `/api/v1/student/course_id/.../onboarding?username=...`). Seeing the deferral by
  hand needs a course with proctored exams enabled, or a throttled network on
  a course where the request is slow enough to catch.
- Weekly learning goals must be enabled on the course for the goal card to
  render at all (`course_goals.weekly_learning_goal_enabled`).

## Verify by hand

- [x] **Outline tab renders as before** — header, outline, sidebar widgets
      (dates, handouts, tools); no console errors; exactly **one** onboarding
      request in the Network tab (the panel and `OutlineTab` share the query;
      `ProductTours` too on this tab).
- [x] **No onboarding request off the outline tab** — dates / progress /
      courseware: zero onboarding GETs (`ProductTours` is `enabled` only on
      outline; the panel doesn't mount elsewhere).
- [x] **Panel content** (course with proctoring, or stub the endpoint to a
      200 with `onboarding_status` / `onboarding_link` / `onboarding_release_date`):
      "This course contains proctored exams" section with status text and the
      onboarding / review-requirements buttons, same as before.
- [ ] **Deferral** (course with proctoring + weekly goals, throttled): the
      goal card appears only after the onboarding request completes; the
      outline tour (new user) starts only after that too.
- [x] **Masquerade** (staff → learner via the masquerade bar): one onboarding
      request, with `username=<masqueraded learner>`, not the staff username.
- [x] **Failure path** (block the onboarding URL or force a 500): the panel is
      hidden, the goal card and tour still unblock immediately (no retry
      delay), and the failure appears in the logging output.

## Left to the automated suite (not re-done by hand)

- Query semantics — `apiHooks.test.tsx` (`useProctoringInfoData`): payload,
  404 → `{}`, single-request error settle, disabled idle.
- Panel rendering per status — `OutlineTab.test.jsx` `Proctoring Info Panel`
  (eight existing cases, unchanged).
- The deferral gate — `OutlineTab.test.jsx` `defers the weekly learning goal
  card until the proctoring info has settled`.
- Tour gating on the outline tab — `ProductTours.test.jsx` (unchanged; the
  prop flows through the real `LoadedTabPage`).

## Results

Env: tutor local (no `EXAMS_BASE_URL`, so the LMS `edx_proctoring` URLs), DemoX,
local branch @ `a9171c30` (no PR yet). Run 2026-09-18. The same commit was
cherry-picked unchanged onto the restructured stack (#2080) as `b60da47e` on
2026-09-19; the diff is identical, so the results carry over.

- **Outline tab renders as before; one onboarding request** — passed:
  filtering the Network tab on `onboar` shows exactly one GET, to the LMS
  `/api/edx_proctoring/v1/user_onboarding/status?...` URL (the panel,
  `OutlineTab` and `ProductTours` share the query). This also established
  that the env has no `EXAMS_BASE_URL`; the #2075 comments and docs that had
  attributed the earlier empty attempt responses to edx-exams were corrected.
- **No onboarding request off the outline tab** — passed.
- **Panel content** — passed, with a dev-only stub on `getProctoringInfoData`
  (3 s delay, then `onboarding_status: 'submitted'`, a link, a release date
  7 days back, not past due, no expiration) and `enableProctoredExams` forced
  on in `getOutlineTabData`: the panel renders the proctored-exams section
  with the submitted status and messaging. Stub removed afterwards
  (`proctoring-dev-stub.patch` in the session scratchpad).
- **Masquerade** — passed.
- **Failure path** — passed.
- **Deferral** — not run by hand: it needs a course with both proctored
  exams and weekly learning goals enabled, and DemoX has neither. Rests on
  `OutlineTab.test.jsx` (`defers the weekly learning goal card until the
  proctoring info has settled`).
