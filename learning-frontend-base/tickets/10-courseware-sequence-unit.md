# 10: Courseware sequence and unit, exams provider stubbed

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner opens a unit and sees its content in the content iframe, moves with previous and next across units and sequence boundaries, sees the hidden-after-due notice on a past-due sequence, the license line, and sequence alerts. The exams provider is a pass-through stub. No sidebar, no breadcrumbs, no unit tab strip (both are operator plugins on master).

**Blocked by:** 09

**Status:** ready-for-agent
**Upstream:** unpublished `issue-body-courseware-sequence-unit.md`

- [ ] Unit content renders; previous and next cross sequence boundaries; hidden-after-due shows its notice; license renders
- [ ] The sequence container, sequence navigation, bottom navigation, unit title and content-iframe loader slots are placeholders
- [ ] The plugin-override registry ports as a provider on the root route; its reachability note is recorded
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 29, CW2. The unit tab strip and breadcrumbs stay absent, matching master out of the box since #1716 and #1685.
