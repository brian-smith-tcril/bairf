# 12: Courseware special exams

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner in a timed exam sees the timer, is gated by exam access on the unit, and can submit; proctored states behave as the library mocks them locally. The pass-through stub from ticket 10 is replaced by the real provider wired to the host's config, HTTP client and auth state.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] A timed exam starts, counts down and submits under the tutor special-exams patch described in the repo facts
- [ ] Exam access on the unit iframe uses the library's access token hook
- [ ] The submitted-timed-exam instructions slot is a placeholder
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decisions 10, 29 (CW4).
