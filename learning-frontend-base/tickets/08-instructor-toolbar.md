# 08: Re-home the instructor toolbar

**Parent:** openedx/frontend-app-learning#1905

**What to build:** Course staff see masquerade controls on every course page without duplication between Learning's toolbar and the shell's masquerade bar, and keep the controls the shell lacks: the Insights link, the course-author gate on the Studio link, and the two toolbar banners.

**Blocked by:** 03

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2194 (in review)

- [ ] On a course route, staff see one masquerade control, not two; which one and why is recorded
- [ ] Insights link, Studio gate and the two banners are present (inserted into the shell's masquerade-bar slot or kept in-page) or each is recorded as a possible breaking change with the reasoning
- [ ] The staff gate matches master's behavior (original user is staff) or the difference is recorded
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Ticket 01 findings item 2. A drop decided here ships as a breaking change with a DEPR filed after merge (decision 9).
