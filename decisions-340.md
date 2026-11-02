# Decisions while writing the slot how-to for openedx/frontend-base#340

1. **Nothing from the FPF era is cited.** The three v1/v2 pairs in the org (recorded in `plan-340.md`, Prior art) shaped the examples only. Brian, 2026-11-02.
2. **Examples are invented, ordered least to most complex**: a prop rename, a prop type change, several changes at once. The rename is written; the other two are placeholders in the first draft. Brian, 2026-11-02.
3. **One arrangement, `v2` wraps `v1`.** The how-to prescribes it and does not describe siblings or `v1`-wraps-`v2`. Every existing pair in the org took it, and it is the one where every old operation keeps working and a new-version replace takes the old version with it.
4. **`@deprecated` notes are split by where an editor shows them**: the interface note names the new interface and the new slot id; each renamed member's note names its new name. Brian's reaction to the first wording, 2026-11-02.
5. **Props interfaces are versioned from the first bump** (`GreetingSlotV1Props`, `GreetingSlotV2Props`), with the unversioned name kept as a deprecated alias of `v1` until `v1` is removed, so a site config typed against it compiles through the coexistence window. Open question 2 of the plan, taken provisionally in the draft; not yet confirmed by Brian.
6. **Step 5 follows ADR 0009 section 3 as written**: propose the old version's deprecation through the OEP-21 process at the time the new version lands. The reconciliation with ADR 0018 draft section 8 (openedx/frontend-base#343) is open question 1 of the plan; the draft does not mention ADR 0018, which is Proposed.
7. **Runtime warnings, pre-release apps, and a link from ADR 0009 are not mentioned** (plan open questions 3, 4, 5), pending Brian.
8. **File is `docs/how_tos/slot-versioning.md`, Markdown**, title "How to: Change a Slot's Props"; the link from the migration how-to's "Refactor slots" section is not yet added.
