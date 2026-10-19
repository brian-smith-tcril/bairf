# 19: Port the live tab

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner in a course with a live provider configured sees the Live tab's embedded provider page.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Live renders with a provider configured in the LMS; the manual-testing record includes the setup recipe
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 27: URL-only or setup-only pages go last.
