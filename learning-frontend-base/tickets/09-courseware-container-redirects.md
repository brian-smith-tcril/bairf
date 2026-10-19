# 09: Courseware container and redirects, course component stubbed

**Parent:** openedx/frontend-app-learning#1905

**What to build:** Every courseware URL form resolves to the right course, sequence and unit, shown on a stub in place of the course component: the bare course URL lands on the resume unit, a sequence URL on its first unit, the preview paths resolve, and a learner without access is sent to the access-denied page.

**Blocked by:** 03

**Status:** ready-for-agent
**Upstream:** openedx/frontend-app-learning#2195

- [ ] The stub prints the resolved course, sequence and unit ids and they match the URL for each form in the redirect table
- [ ] Redirect tests pass through the route array
- [ ] The URL-decoding and path-fixes layout routes behave as on master for encoded course keys and spaces
- [ ] Courseware data layer ports here
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops
- [ ] Coverage for the ported directory compared against the master baseline in the manual-testing record

Notes: Decision 29, CW1.
