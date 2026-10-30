# Plan: openedx/frontend-base#334 — widget `idAliases`

Written 2026-10-30 against `ae5ec93` on `main`. The plan block of the issue is this file minus the heading.

## Baseline

- Slot aliases (#178): `Slot` takes `idAliases` and puts them in `SlotContext`; `useSlotOperations` passes `[id, ...idAliases]` to `getSlotOperations`, which matches `operation.slotId` against that list. The PR touched runtime code and tests only; nothing under `docs/` and no slot showcase entry mentions `idAliases`.
- Widget identity: `WidgetIdentityProps` is `{ id, role? }`, carried by `APPEND`, `PREPEND`, `INSERT_AFTER`, `INSERT_BEFORE` and `REPLACE`. `createIdentifiedWidget` (`runtime/slots/widget/utils.tsx`) builds an `IdentifiedWidget` `{ id, role?, node }` and wraps the node in `WidgetProvider`, whose `WidgetContext` carries `slotId`, `widgetId` and `role`.
- Targeting: `findRelatedWidgetIndex` matches `relatedId` against `widget.id` by equality and returns the first match in list order, or `null`; `insertAfterWidget`, `insertBeforeWidget`, `replaceWidget` and `removeWidget` do nothing on `null`. `useWidgetOptionsForId(slotId, widgetId)` (`runtime/slots/widget/hooks.ts`) keeps `OPTIONS` operations whose `relatedId === widgetId`. `useSortedWidgetOperations` orders two insert operations by `a.id === b.relatedId`; its guard `isWidgetRelativeOperation` covers `INSERT_AFTER` and `INSERT_BEFORE` only, so `REPLACE`, `REMOVE` and `OPTIONS` get no dependency ordering today. `WidgetList.byId` and `withoutId` filter by `w.id === id`.
- Public surface: `runtime/slots/widget/index.ts` re-exports its hooks, utils, types and `WidgetContext`, and `runtime/index.ts` re-exports `./slots`, so `IdentifiedWidget`, `WidgetContext`, `useWidgetOptionsForId` and `createWidgets` are package API. Every change below is additive: an optional field or an optional trailing parameter.

## Change

1. **Types** (`runtime/slots/widget/types.ts`). `idAliases?: string[]` on `WidgetIdentityProps`, with the TSDoc that is this feature's documentation, and on `IdentifiedWidget`. `WidgetContext` (`WidgetContext.tsx`) gains `widgetIdAliases?: string[]`, named beside `widgetId`.
2. **One match helper** in `runtime/slots/widget/utils.tsx`, exported so `hooks.ts` can use it: `matchesWidgetId(identity: { id: string; idAliases?: string[] }, id: string)` returns `identity.id === id || (identity.idAliases?.includes(id) ?? false)`. Both an operation with `WidgetIdentityProps` and an `IdentifiedWidget` fit the parameter structurally.
3. **`createIdentifiedWidget`** copies `idAliases` from the operation onto the identified widget and passes it to `WidgetProvider` as `widgetIdAliases`, which `WidgetProvider` puts in the context.
4. **`findRelatedWidgetIndex`**, **`byId`** and **`withoutId`** compare through `matchesWidgetId`. This covers `insertAfterWidget`, `insertBeforeWidget`, `replaceWidget` and `removeWidget` in one place.
5. **`useWidgetOptionsForId(slotId, widgetId, widgetIdAliases = [])`**: a third, optional parameter; an `OPTIONS` operation applies when `matchesWidgetId({ id: widgetId, idAliases: widgetIdAliases }, operation.relatedId)`. `useWidgetOptions` reads `widgetIdAliases` from `WidgetContext` and passes it through. Existing callers of the two-argument form are unchanged.
6. **`useSortedWidgetOperations`** compares through `matchesWidgetId(a, b.relatedId)` and `matchesWidgetId(b, a.relatedId)`, so an insert relative to an alias is still sorted after the operation that declares the alias. The guard stays as it is; ordering for `REPLACE`, `REMOVE` and `OPTIONS` is a pre-existing limit and not this change.
7. **Precedence.** When a `relatedId` matches one widget's alias and another widget's id, the first widget in list order wins, exactly as two widgets with the same id resolve today. No ranking of id over alias.
8. **Docs.** The TSDoc on `WidgetIdentityProps.idAliases`, in the style of the per-member comments on `WidgetOperationTypes`: other ids the widget answers to; a relative operation (`INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE`, `OPTIONS`) whose `relatedId` names one of them applies as if it named `id`; when a widget id is renamed, keep the old id here for at least one release so site configs that target it keep working. No showcase entry (none exists for slot aliases either) and no ADR (#178 added none, and this changes no decision in ADR 0009 or ADR 0016).

Not here: dependency ordering for `REPLACE`, `REMOVE` and `OPTIONS` in the sort; any runtime notice when an operation targets an alias.

## Tests

- `runtime/slots/widget/utils.test.tsx`, a new `describe` on aliases using the existing `makeAppendOp` helper extended with `idAliases`: each of `INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE` and `REMOVE` configured against an alias applies (asserted on `identified` ids and order); against the primary id still applies; a `relatedId` matching neither id nor alias is a no-op; `byId` and `withoutId` match an alias; precedence: a widget with id `x` listed before a widget with alias `x`, and the reverse, each time the earlier one is targeted; `identified` exposes `idAliases`.
- `runtime/slots/widget/hooks.test.tsx` (new), in the shape of `runtime/slots/layout/hooks.test.tsx` with `../hooks` mocked: `useSortedWidgetOperations` places an insert relative to an alias after the operation declaring that alias, in both declaration orders; `useWidgetOptionsForId` merges options declared against an alias and against the primary id and ignores others; `useWidgetOptions` reads `widgetIdAliases` from a `WidgetContext.Provider` wrapper.
- `runtime/slots/Slot.test.tsx`, beside #178's site-config block: an `APPEND` widget declaring `idAliases: ['old-widget']` and a `REMOVE` with `relatedId: 'old-widget'` renders nothing from that widget.
- `npm run typecheck`, `npm run lint`, `npm test`.

## Commit and PR

One commit, `feat: support widget ID aliases`, the sibling of #178's `feat: support slot ID aliases`; `.releaserc` makes it a minor release. Commitlint is `.github/workflows/commitlint.yml` calling `openedx/.github/.github/workflows/commitlint.yml@master` with no local config, the same chain as the learning repo. Branch `widget-id-aliases` on the fork, PR against `main`, "Resolves #334". Verification is the test suite; the first consumer check is openedx/frontend-app-learner-dashboard#878 adopting the alias for its two header link ids, outside this PR.
