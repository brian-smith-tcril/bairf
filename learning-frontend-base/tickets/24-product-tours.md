# 24: Port product tours

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A new learner sees the course home tour and the courseware tour as on master, anchored to elements that exist in the ported pages.

**Blocked by:** 05, 10

**Status:** ready-for-agent

- [ ] Both tours run end to end; the anchor that lived in the removed tab strip is re-targeted and recorded
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Ticket 01 findings item 3 (the tour target in the old tab strip).
