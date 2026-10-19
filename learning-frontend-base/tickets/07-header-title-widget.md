# 07: Header widget for the org and title line

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner sees the course's org and title in the shell header on every course page, as the legacy header showed them. Learning inserts a widget into a shell header slot through its slot operations; the widget reads the course id from the route and the metadata from the shared query cache under Learning's key, and renders only on course routes.

**Blocked by:** 03

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2193 (in review)

- [ ] The org and title line appears in the header on every course route and on no other route of the site
- [ ] The widget does not fetch when the frame has already loaded the metadata; it reads the cache
- [ ] Desktop and mobile placements chosen and recorded (candidates: desktop left, mobile center, or the course bar's extra-content slot)
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops

Notes: Decision 20 and ticket 01's correction. Nothing from the legacy header package is ported.
