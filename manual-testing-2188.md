# Manual testing — route tree with stub pages, roles and provides (#2188)

This layer claims **no page content**: every route renders a stub naming
its page, and what is verified by hand is the routing, the roles and the
`provides` wiring as the shell sees them.

## Environment

- The package's dev site: `cd frontend-base && nvm use && npm ci && npm run dev`
  on the layer branch, served at `http://apps.local.openedx.io:2000/learning/`,
  with tutor dev's `mfe` service stopped so the port is free.
- Tutor dev with the demo course `course-v1:OpenedX+DemoX+DemoCourse`, the
  LMS's learning URL pointing at `apps.local.openedx.io:2000/learning` so
  the tabs `course_metadata` lists resolve to this site, signed in as a
  staff user (the masquerade bar is staff-only).

## Verify by hand

- [x] **Course home renders its stub under the shell** — at
      `/learning/course/<courseId>/home`: the shell header and footer, the
      course bar listing the course's tabs, and the body "outline: not yet
      ported" with `courseId=<courseId>` under it.
- [x] **Tab switches are client-side** — click each tab in the course bar:
      the body changes to that tab's stub with no document request in the
      network panel and the console keeping its earlier lines. The
      discussion tab, whose LMS URL points at the discussions app, may be
      a full-page link; note which it is.
- [x]  **Masquerade bar on course routes** — as staff, the masquerade bar
      renders on the course home stub and on a courseware stub.
- [x] **Courseware paths with ids** — `/learning/course/<courseId>/<seq>/<unit>`
      shows "courseware: not yet ported" with `sequenceId` and `unitId`
      listed; `/learning/preview/course/<courseId>/<seq>` likewise.
- [x] **Progress with a target user** — `/learning/course/<courseId>/progress/42`
      shows the progress stub with `targetUserId=42`.
- [x] **Non-course paths** — `/learning/goal-unsubscribe/tok`,
      `/learning/redirect/dashboard` and `/learning/preferences-unsubscribe/tok`
      each show their stub, with the shell header and footer (no course
      bar, since no course route is active).
- [x] **Unmatched path** — `/learning/nope` shows the shell's not-found
      page, with header and footer this time, since the root route matched.
- [x] **Console** — no error or warning from the app on any of the above.
- [x] **No masquerade request without a course** — on the three non-course
      pages the network panel shows no request to `/courses//masquerade`
      (the first pass found four; see results).

## Left to the automated suite

- Every path renders its stub with the params it captures:
  `src/routes.test.tsx`, one block per page.
- Role declarations and `provides`, and what each role resolves to:
  `src/app.test.ts`.

## Results

**First pass, 2026-10-22, Brian, on the tree with the root `learning` role
provided (`892f928b`).** Course home rendered its stub under the shell with
the course bar (box 1 passed). The discussions tab was absent from the bar:
`course_metadata` lists it only when discussions are enabled on the course,
and the shell renders exactly that list; enabling discussions in Studio's
Pages & Resources brings it back. Non-course pages showed the shell header
and footer with no course bar or masquerade bar, as expected. Console on
the goal-unsubscribe page: `GET http://local.openedx.io:8000/courses//masquerade`
404, four times (refetched on window focus), from the shell's masquerade
bar mounting on a non-course route under the root role and querying with
an empty course id (decision 7); the React Router future flag warning
(openedx/frontend-base#325); `Nav: Support for defaultProps will be
removed`, react-bootstrap's `Nav` in the shell header; `UNSAFE_componentWillMount
... SideEffect(NullComponent)`, react-helmet under StrictMode; webpack-dev-server
websocket and back-forward-cache lines. Nothing from the layer's own code.
The tree was restructured in response (course layout routes carrying
`learningCourse`); every box is re-checked on the restructured tree.

**Second pass, 2026-10-22, Brian, on the restructured tree (`d638d386`,
local branch before push).** All nine boxes passed, including the new one:
no request to `/courses//masquerade` on the non-course pages, since the
masquerade bar no longer mounts there.
