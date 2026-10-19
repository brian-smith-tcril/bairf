# 06: Port the access-denied page

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner without access to a course lands on the access-denied page with the reason and the next step, as on master.

**Blocked by:** 03

**Status:** ready-for-agent
**Upstream:** unpublished `issue-body-access-denied.md`

- [ ] The page renders for each access-denied reason the course-metadata response produces
- [ ] Courseware's redirect to it (ticket 09) has a real destination once this lands
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record
