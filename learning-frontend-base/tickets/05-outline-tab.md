# 05: Port the outline tab

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner opens the course home (the outline tab) and sees the outline, the start and resume controls, the weekly goal card and the section outline, as on master; effort estimates come with it.

**Blocked by:** 03

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2191 (in review)

- [ ] Course home renders for an enrolled learner, with the section-outline slot as a placeholder and the tab notifications slot rendering nothing
- [ ] Effort estimate shared module ports here
- [ ] The enrollment and logistration alert hooks, which only the outline tab's payload feeds, are noted for #2186 as before
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 27; canonical name per glossary. The courseware outline sidebar (ticket 12) reads outline data through its own hooks and is not part of this ticket.
