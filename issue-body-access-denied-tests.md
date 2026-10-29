**What:** the Dates tab's test has a block of access-denied redirect cases that don't test the Dates tab. They test `TabPage`'s redirect, which every course-home tab and courseware share, and `CoursewareContainer.test.jsx` tests the same redirect again for a superset of the error codes.

**How it works today** (on `master`):

- When the course metadata says `hasAccess: false`, `TabPage` ([`src/tab-page/TabPage.tsx`](https://github.com/openedx/frontend-app-learning/blob/master/src/tab-page/TabPage.tsx)) calls `getAccessDeniedRedirectUrl` ([`src/shared/access.js`](https://github.com/openedx/frontend-app-learning/blob/master/src/shared/access.js)) and renders `<Navigate>` to the URL it returns. `TabPage` is the function's only caller; the course-home tabs and `CoursewareContainer` all render `TabPage`.
- Both blocks arrived in c667e294 (#558, 2021-07-26). The Dates block opens with: "These tests could go into any particular tab, as they all go through the same flow. But dates tab works."
- `DatesTab.test.jsx`'s "when receiving an access denied error" covers six codes: `survey_required`, `unfulfilled_milestones`, `audit_expired`, `course_not_started`, `authentication_required`, `enrollment_required`. `CoursewareContainer.test.jsx`'s "when receiving a course_access error_code" covers the same six plus `data_sharing_access_required`, `incorrect_active_enterprise` and `course_not_started_enterprise_learner`.
- Both blocks render a route and mock the course-metadata request with server-shaped data (`course_access: { has_access, error_code, ... }`), so they also cover the `course_access` to `courseAccess` conversion that `TabPage` reads. No other test checks that conversion: `TabPage.test.jsx` hands `TabPage` a camel-cased `courseStatus` it builds itself, and its two denied cases assert the loading state and the absence of tab content, not the redirect. `getAccessDeniedRedirectUrl` has no test of its own.

**How this surfaced:** #2189 ports the Dates tab to frontend-base. The Dates block moves with it, changed only where its assertions read the URL: the port's memory router keeps its location on the router, not on `window.location`. Courseware is ported later, so until then the Dates block is the port's only coverage of the redirect.

**To discover**

- Which tests should own the redirect cases: the route-level suites, `TabPage.test.jsx`, a test of `getAccessDeniedRedirectUrl`, or a split between them.
- Whether both route-level blocks stay, given the courseware block covers every code the Dates block does.
- If the cases leave the route-level suites, what checks that the metadata response's `course_access` reaches `TabPage` as `courseAccess`.

> [!NOTE]
> This issue body was drafted by Claude (Claude Code) and reviewed before posting.
