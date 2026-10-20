# 17: Courseware social share

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner sees the social share controls in a unit when the course enables them.

**Blocked by:** 10

**Status:** folded into 16 (the share buttons render only inside the first-section celebration modal and the course-exit celebration)

- [ ] Share controls render with the configured hashtag and URLs from app config
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Course exit (ticket 18) reuses this; it is blocked on this ticket.
