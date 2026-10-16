# ADR policy for Open edX repos

ADRs live in each repo's `docs/decisions/`, numbered. They record **behaviour decisions**: what the system does and why, not how a file implements it.

## Frontend

- **frontend-base owns ecosystem decisions.** Its ADRs are the standing record for how frontend apps are built. It is ADR-heavy by design, because it is foundational.
- **A frontend app's ADR is rare.** It records something only that app decides. It never restates, narrows or contradicts a frontend-base ADR. When an app's work seems to need a different answer, that is a question raised with frontend-base, not an ADR in the app.
- **The decisions doc is the valve.** Per-layer reasoning lives in the effort worktree's `decisions-<issue>.md`, embedded verbatim in the PR. That is where most decisions belong, which is what keeps ADR pressure low.

## Gates

A candidate passes all four before it is proposed:

1. Hard to reverse.
2. Surprising without context.
3. A real trade-off was weighed (only alternatives that were actually considered are listed).
4. Only this repo decides it; no existing ADR in this repo already covers it.

In a frontend app the fourth gate also checks frontend-base's ADRs, since they are the ecosystem's standing decisions (see Frontend above).

## Agents propose, never write

Name the candidate, the gates it passes, and the ADRs it was checked against. Then stop. mattpocock's `domain-modeling` skill writes ADRs inline when its gates pass; in these repos that step is replaced by the proposal above.

## Amendments

An ADR is amended only when a change alters a decision it records. Error handling, access rules, implementation details, the implementing file, and anything the layer did not change stay out. An apparent typo stands until there is proof it was a typo and not a change of mind. When an issue's task list says "update the ADR" and the layer changed nothing the ADR records, the non-change is noted in the decisions doc instead.
