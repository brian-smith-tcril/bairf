# 11: Courseware outline sidebar

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner navigates courseware with the outline sidebar as on master: open and close on desktop, the mobile trigger, section and unit navigation, completion icons that update.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Sidebar opens, closes, navigates, and shows completion icons on desktop and mobile
- [ ] The sidebar context and widget registry land with no right-sidebar widgets yet
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 29, CW3; precedes exams so exam testing has a way out to another section.
