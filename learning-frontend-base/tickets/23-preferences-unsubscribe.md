# 23: Port preferences unsubscribe

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner following a preferences unsubscribe link from an email sees the result page and the preference is updated.

**Blocked by:** 02

**Status:** ready-for-agent
**Upstream:** unpublished `issue-body-preferences-unsubscribe.md`

- [ ] Valid and invalid tokens produce the right result; the plain header this page used is replaced by the shell's; recipe recorded
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record
