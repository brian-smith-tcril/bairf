# Decisions while writing the ADR for openedx/frontend-base#341

1. **Number 0019.** `0017` landed in #298 after the plan was first written; `0018` is the file in the open PR #326. Taking `0019` avoids a clash with #326 whichever lands first; a gap if #326 never lands is harmless.
2. **Status Proposed**, as ADR 0016 is; ADR 0017 landed as Accepted but was proposed in the same PR that implemented it. This one has no implementation to carry it.
3. **No edits to ADR 0009, 0013 or 0016.** None records a decision this ADR changes; the clarifications of 0009 (roles are slot API; the default-content exclusion governs the slot's version only) are stated in 0019 section 2 and the References link both ways only from 0019.
4. **ADR 0012 is not referenced.** It is marked Moved; the reference goes to OEP-10 ADR 0002 directly, as the README does.
5. **The `INSERT_BEFORE` TSDoc said "insert after".** Pre-existing copy error on a line the order rule touched anyway; corrected in the same edit rather than left false.
6. **The config-key table is in the ADR body with prose examples**, using real keys from frontend-app-catalog and frontend-app-learner-dashboard, so the rule is checkable against a diff rather than abstract.
7. **The three parked topics** (message ids, route paths, non-peer `dependencies`) are named in Consequences as not addressed, with "silence on them is not a decision either way", so a reader does not infer a rule from their absence. They also go in the PR body for discussion.
