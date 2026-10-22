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

- [ ] **Course home renders its stub under the shell** — at
      `/learning/course/<courseId>/home`: the shell header and footer, the
      course bar listing the course's tabs, and the body "outline: not yet
      ported" with `courseId=<courseId>` under it.
- [ ] **Tab switches are client-side** — click each tab in the course bar:
      the body changes to that tab's stub with no document request in the
      network panel and the console keeping its earlier lines. The
      discussion tab, whose LMS URL points at the discussions app, may be
      a full-page link; note which it is.
- [ ] **Masquerade bar on course routes** — as staff, the masquerade bar
      renders on the course home stub and on a courseware stub.
- [ ] **Courseware paths with ids** — `/learning/course/<courseId>/<seq>/<unit>`
      shows "courseware: not yet ported" with `sequenceId` and `unitId`
      listed; `/learning/preview/course/<courseId>/<seq>` likewise.
- [ ] **Progress with a target user** — `/learning/course/<courseId>/progress/42`
      shows the progress stub with `targetUserId=42`.
- [ ] **Non-course paths** — `/learning/goal-unsubscribe/tok`,
      `/learning/redirect/dashboard` and `/learning/preferences-unsubscribe/tok`
      each show their stub, with the shell header and footer (no course
      bar, since no course route is active).
- [ ] **Unmatched path** — `/learning/nope` shows the shell's not-found
      page, with header and footer this time, since the root route matched.
- [ ] **Console** — no error or warning from the app on any of the above.

## Left to the automated suite

- Every path renders its stub with the params it captures:
  `src/routes.test.tsx`, one block per page.
- Role declarations and `provides`, and what each role resolves to:
  `src/app.test.ts`.

## Results

Not yet run.
