# 02: Frame: root route, stub routes, roles and `provides`

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner on a frontend-base site sees Learning's tabs in the shell header's course bar and each tab switches client-side to a page that says it is not yet ported. The app exports a route array with one root route at `learning` holding a bare outlet and a stub route for each of the eleven route-level pages, `handle.roles` on every route (the root `learning` role and one role per page), and `provides` listing the root role under both course-bar keys. Nothing fetches and no provider mounts.

**Blocked by:** 01

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2188 (in review)

- [ ] Every one of the eleven paths renders its stub line under the shell
- [ ] The shell course bar lists the course's tabs and navigates to Learning's tabs without a full page load; the masquerade bar appears on course routes for staff
- [ ] The route array carries no site-basename assumption; the `/preview/course/...` patterns are present on the courseware stub
- [ ] Route tests assert each path renders its stub through the exported route array under a test router
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops

Notes: Decisions 21, 22, 26, 31. The discussion route's stub is included; its port (ticket 20) proposes a redirect. No DEPR question arises here because no route is omitted.
