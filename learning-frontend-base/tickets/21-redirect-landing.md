# 21: Port the redirect landing page

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner sent through Learning's redirect landing page by the LMS arrives where the LMS intended.

**Blocked by:** 09

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2205 (in review)

- [ ] Each redirect form the page handles resolves; the manual-testing record includes a recipe for triggering it
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Shares redirect code with ticket 09.
