# Decisions — port the outline tab (#2191)

The effort's working log for #2191: what was settled and done, in order.
Each layer's own decisions are in its `decisions-<pr>.md`, embedded in
its PR.

1. **The plan is settled and posted (2026-11-12).** `plan-2191.md`,
   written and settled with Brian in one session; #2191's body was
   updated from `issue-body-outline-tab.md` in one edit and matches it.
   What was settled on the way: two layers on the running stack; the
   dates links read `useDatesTabUrl()`, with the `master` behavior filed
   as openedx/frontend-app-learning#2250 (no status line until the
   outline layer's PR exists); the goal card's flags as images under
   `widgets/assets/` (`decisions-1905.md` 40); the handouts iframe's
   three rules inline (`decisions-1905.md` 41).
   - A statement of mine to Brian was wrong and is corrected in the
     plan: "today the dates link always renders". The cases where
     `tabs` has no dates tab are a hidden Dates tab and a learner gated
     by the entrance exam, and they differ on `master`.

2. **The shared-modules layer is up as a draft: #2251 (2026-11-12).**
   Built on `bsmith/outline-shared-modules`, added to the stack above
   `bsmith/progress-entrance-exam` with `gh stack add`. Brian read the
   layer in the diff viewer (served from a commit object built off the
   working tree, on no branch) and asked about the two new alert tests,
   the placement of the four modal names under openedx/paragon#3043
   (they are function components declared in Paragon's `src/Modal/`,
   none importing react-bootstrap) and `EffortEstimate`'s class name
   (read once, by `classNames`, which gives the same string for `null`
   and absent). He took the layer as it stood. Commit `d09cf170`, whose
   tree is the tree he read. `gh stack submit --auto --remote upstream`
   pushed the branch and opened #2251 on #2249's branch; GitHub's
   stack #2248 now holds #2246, #2247, #2249 and #2251. The body was
   set from `pr-body-2251.md` in one `gh pr edit` and matches it; the
   commit's authors on GitHub are Brian and Claude. The three lower
   branches were not moved by the submit.
   - The project checkout is on `bsmith/outline-shared-modules` with
     only the local lint change uncommitted.
   - CI on #2251 has not been read here; Brian watches CI.
   - Next: the outline tab layer, `bsmith/outline-tab`, on Brian's go.
