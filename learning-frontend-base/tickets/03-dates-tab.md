# 03: Port the dates tab

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner opens the Dates tab and sees the course's dates timeline as on master. This layer brings the tab-page frame (tab page, loaded tab page, alerts), the course-metadata fetch owned by the frame, the Learning-wide providers on the root route (user messages, toast, notices, plugin overrides), and the test setup conventions from decision 23. The instructor toolbar and product tours are left out of the frame for their own layers.

**Blocked by:** 02

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2189

- [ ] The dates tab renders its timeline, upgrade banner slot as a placeholder, and the alerts the frame shows on every tab
- [ ] The root route's element mounts the Learning-wide providers; no provider is registered in `App.providers`; the shell's query client is used
- [ ] The test setup calls frontend-base's mock-app initializer and adds app configs at top level; a shared render helper exists; the dates tests pass through the route array
- [ ] Tab switching between dates and another stub keeps the frame mounted
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decisions 23, 27, 30. First page port; the record of what was faithful and what deviated is the template for the later page layers.
