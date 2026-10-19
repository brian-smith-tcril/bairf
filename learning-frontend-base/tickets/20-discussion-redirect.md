# 20: Discussion route as a redirect

**Parent:** openedx/frontend-app-learning#1905

**What to build:** A learner following an old `/learning/course/<id>/discussion/<path>` link lands on the same path in the discussions app. The route is kept; its element is a loader that resolves the discussions role (an external route today, the installed discussions app later) and redirects. The 2022 iframe is not ported.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A discussion URL redirects to the discussions app with the course id and path preserved; an unresolved role falls through to not found
- [ ] The sub-issue body proposes the redirect and records that the review round decides between redirect and iframe
- [ ] Types, lint and tests of the new package pass; master's legacy workflow stays green; `npm run dev` from the new package serves every route ported so far
- [ ] The layer's route or feature was exercised by hand in the verification environment and the observations are in the PR's manual-testing record; a behavior found untested got a test in the same PR
- [ ] Manifest lines added for every legacy file this layer ports or drops

Notes: Decisions 24, 28. The in-context discussions sidebar (ticket 13) is unaffected.
