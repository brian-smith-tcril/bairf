# widget-id-aliases

Working docs for openedx/frontend-base#334, widget `idAliases` (started 2026-10-30). The issue was drafted in the review effort for openedx/frontend-app-learner-dashboard#878; this task implements it. Nothing here is linked from a project repo.

State, 2026-10-30: openedx/frontend-base#335 open against `main`, one commit, self-reviewed at `565a8a9` (decisions 1 and 6 corrected in the body and `decisions-334.md`), awaiting review. The code checkout is the sibling `frontend-base` directory on `widget-id-aliases`.

- `plan-334.md`: the plan, mirrored into the issue's plan block
- `decisions-334.md`: decisions made while implementing, embedded whole in the PR
- `manual-testing-334.md`: the dev-site showcase pass, embedded whole in the PR; `manual-testing-334.patch` is its local edit, ready for `git apply`
- `pr-body-335.md`: mirror of the PR description

## Self-review of #335, 2026-10-30, at `565a8a9`

Fixed: decision 6 described a `makeRelativeOp` helper that was never written, and decision 1 did not say `matchesWidgetId` becomes package API through the `export *` chain. Both corrected in the body and `decisions-334.md`.

Open, awaiting Brian's pick between fixing here and a follow-up:

- `runtime/slots/widget/utils.tsx:126`: `createIdentifiedWidget` destructures `id` for `key` but reads `operation.id` for `widgetId`; the new `widgetIdAliases={idAliases}` sits between them on the destructured side. Pre-existing; zero-size.

Checked and found fine: the `WidgetContext` default value omitting `widgetIdAliases` mirrors #178, which added `idAliases` to the `SlotContext` type and left its default alone (withdrawn as a nit, Brian's call); no exact widget id comparison remains in `runtime` outside the widget directory; the sort test's declaring operation is an `INSERT_AFTER`, so it exercises the new comparison inside the relative branch; the `useMemo` dependency on the aliases array is the operation's own reference, as stable as `operations`; precedence is the pre-existing first-match loop; scope mirrors #178 (runtime code and tests only); CI green on commitlint, tests and both version checks; openedx/frontend-app-learner-dashboard#878 exists and is open; the Slot test's `renderedWidgetTexts` sees only widget divs because the default layout is a fragment and `Slot` renders no wrapper.
