# 13: Courseware right sidebar and widgets

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner opens the right sidebar tray and sees the discussions panel for a course with discussions configured and the upgrade panel on a course with a verified mode.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Tray opens and closes; discussions panel loads; upgrade panel appears when the course has a verified mode
- [ ] Sidebar widget configuration is readable from app config under its existing key; the operator-facing change from the plugin config file is noted
- [ ] The upgrade widget's own plugin slot is a placeholder
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 29 (CW5); ticket 03 item 3.
