# Decisions while writing the ADR for openedx/frontend-base#341

1. **Number 0019.** `0017` landed in #298 after the plan was first written; `0018` is the file in the open PR #326. Taking `0019` avoids a clash with #326 whichever lands first; a gap if #326 never lands is harmless.
2. **Status Proposed**, as ADR 0016 is; ADR 0017 landed as Accepted but was proposed in the same PR that implemented it. This one has no implementation to carry it.
3. **No edits to ADR 0009, 0013 or 0016.** None records a decision this ADR changes; the clarifications of 0009 (roles are slot API; the default-content exclusion governs the slot's version only) are stated in 0019 section 2 and the References link both ways only from 0019.
4. **ADR 0012 is not referenced.** It is marked Moved; the reference goes to OEP-10 ADR 0002 directly, as the README does.
5. **The `INSERT_BEFORE` TSDoc said "insert after".** Pre-existing copy error on a line the order rule touched anyway; corrected in the same edit rather than left false.
6. **The config-key table is in the ADR body with prose examples**, using real keys from frontend-app-catalog and frontend-app-learner-dashboard, so the rule is checkable against a diff rather than abstract.
7. **The three parked topics** (message ids, route paths, non-peer `dependencies`) are named in Consequences as not addressed, with "silence on them is not a decision either way", so a reader does not infer a rule from their absence. They also go in the PR body for discussion.

## Review pass on the first draft, 2026-11-02

First draft as pushed to the fork: `brian-smith-tcril/frontend-base@a9ef976`.

8. **Context is two sentences**: "A maintainer of an app needs to know which changes to it are breaking." and "This ADR lists what an app promises." The release machinery (semantic-release, alphas, graduation) is not context; the branch model appears once, in Consequences, as the reason the markings matter. The history of where the question came up (ADR 0009's exclusion, ADR 0016, the Paragon range bumps) was tried as a bulleted Context and dropped: a "nothing says" or "was undecided" framing is not how the sibling ADRs open, and the facts are already in the Decision and the rejected alternatives.
9. **Every Decision section has one shape**: a sentence naming what is contract, then a "Breaking:" list and a "Not breaking:" list. Route roles and `provides` moved out of the config section into their own section 5 so the config section is the sentence and the table. The six config examples are a third column of the table instead of prose.
10. **No issue links and no commit SHAs in the ADR.** Checked against the other eighteen ADRs: none links to an issue or PR or cites a SHA. The #336 and #339 references and the Paragon commit SHAs came out.
11. **The scope note that the shell is an app lives in Consequences**, as two bullets ("Every frontend app follows these rules." / "frontend-base's shell follows them too."), not inside the definition in section 1.
12. **Decision 7 reversed**: "Silence on them is not a decision either way" is cut; "are not addressed here" says the same thing.
13. **Precedent commit for the floor raise**: the `^23.4.5` to `^23.20.0` bump reached main inside the `feat:` translations commit (37e3901), with the bump incidental. The dedicated floor raise on main is 2082df5, `chore: upgrade the minimum version of Paragon`, `^22.17.0` to `^22.20.1`. The ADR no longer cites either (decision 10); the plan's citation of 37e3901 stands corrected here.
14. **rst checked with docutils** (`rst2html`, brew): the only messages are the Sphinx-only `:doc:` role in References, which ADR 0016 produces too.

Open from the pass, not changed: the "key moves to `commonAppConfig`" table row describes a diff an app cannot make in its own code, and ADR 0009 section 3's deprecation process is not reconciled with "no DEPR on main". Section 6's "including the types its slot props are built from" is a how-used clause by the reasoning that removed the Context bullet.
