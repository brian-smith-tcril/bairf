# 04: Port the progress tab

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner opens Progress and sees grades, completion and certificate status as on master, with every progress slot a placeholder.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Progress renders for a learner with and without grades; certificate status main body and side panel placeholders show default content
- [ ] The exams-data hook survives as code with no in-app caller; a note in the PR records whether it is exported from the package index
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 27 prefers this before the outline tab. Ticket 03 of the map lists the exams-data contract note that belongs here.
