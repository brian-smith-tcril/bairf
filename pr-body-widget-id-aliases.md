## Summary

A widget operation can declare `idAliases`, other ids the widget answers to. A relative operation (`INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE`, `OPTIONS`) whose `relatedId` names an alias applies as if it named the widget's `id`, and `WidgetList.byId` and `withoutId` match aliases too. This is the widget-side mirror of slot `idAliases` from #178, so an app can rename a widget id and keep the old one as an alias for a release instead of silently breaking every site config that targets it. **No change for widgets without aliases**: every id comparison stays exact for them, and every API change is an optional field or an optional trailing parameter.

Resolves #334.

## What changed

- `WidgetIdentityProps` and `IdentifiedWidget` gain `idAliases?: string[]`; the TSDoc on the former documents the field and the deprecation pattern.
- `matchesWidgetId(identity, id)` in `runtime/slots/widget/utils.tsx` compares an id against a widget's `id` and `idAliases`. `findRelatedWidgetIndex`, `byId`, `withoutId` and the relative-operation sort in `useSortedWidgetOperations` compare through it.
- `createIdentifiedWidget` copies `idAliases` onto the identified widget and passes it to `WidgetProvider`, whose `WidgetContext` gains `widgetIdAliases`.
- `useWidgetOptionsForId(slotId, widgetId, widgetIdAliases?)` takes the aliases as an optional third parameter; `useWidgetOptions` reads them from the context. Two-argument callers are unchanged.
- Precedence when an id and an alias both match a `relatedId`: the first widget in list order, as duplicate ids resolve today.
- Tests: alias cases for every relative operation, `byId`/`withoutId`, precedence in both orders and `identified` in `runtime/slots/widget/utils.test.tsx`; a new `runtime/slots/widget/hooks.test.tsx` for the sort and the options hooks; each of the five relatedId operations against an alias through site config on a rendered `Slot` in `runtime/slots/Slot.test.tsx`.

## Testing

`npm run typecheck`, `npm run lint` and `npm test` pass. Manual pass on the shell dev site's slot showcase with its relative operations retargeted at aliases through a local edit: every section rendered as it does unedited, and a control pointed at an undeclared id was a no-op. The first consumer is openedx/frontend-app-learner-dashboard#878, adopting aliases for its two renamed header link ids.

## Decisions

Six decisions made while implementing, recorded below.

<details>
<summary>Full decision log</summary>


1. **One match helper, exported.** `matchesWidgetId(identity, id)` in `runtime/slots/widget/utils.tsx` returns `identity.id === id || (identity.idAliases?.includes(id) ?? false)`, with the parameter typed structurally as `{ id: string; idAliases?: string[] }` so both an operation carrying `WidgetIdentityProps` and an `IdentifiedWidget` fit. It is exported because `hooks.ts` uses it for the sort and the options hook; the other `hasWidget*` helpers in that file stay unexported because nothing outside the file reads them.

2. **The options hook takes the aliases as an optional third parameter, with no default.** `useWidgetOptionsForId(slotId, widgetId, widgetIdAliases?)` keeps the two-argument form working for existing callers. No `= []` default: a fresh array on every render would be a new `useMemo` dependency each time and recompute the merge on every render for every widget without aliases. The hook builds `{ id: widgetId, idAliases: widgetIdAliases }` for the helper instead.

3. **Precedence is list order.** `findRelatedWidgetIndex` returns the first widget whose id or aliases match, which is what it did for duplicate ids before. A widget whose primary id matches does not outrank an earlier widget whose alias matches. The test covers both orders.

4. **The sort's guard is untouched.** `isWidgetRelativeOperation` still narrows to `INSERT_AFTER` and `INSERT_BEFORE`, so `REPLACE`, `REMOVE` and `OPTIONS` get no dependency ordering, aliases or not. Pre-existing, and widening it changes which operations the sort reorders, so it is its own change if wanted.

5. **Docs are the TSDoc on `WidgetIdentityProps.idAliases`.** Written in the style of the per-member comments on `WidgetOperationTypes` (one paragraph, two spaces after a period, "ID" capitalised as those comments do). Nothing under `docs/` or in the slot showcase documents slot `idAliases` either, so there was no prose to extend and no showcase entry is added.

6. **Tests follow the three existing shapes.** The alias cases for `createWidgets` extend `runtime/slots/widget/utils.test.tsx` through its `makeAppendOp` helper plus a generic `makeRelativeOp<T>` (generic so each call's `op` stays a single literal and the result is assignable to `WidgetOperation`). The hooks get a new `runtime/slots/widget/hooks.test.tsx` in the shape of `runtime/slots/layout/hooks.test.tsx`, with `../hooks` mocked. The end-to-end cases, each of `INSERT_AFTER`, `INSERT_BEFORE`, `REPLACE`, `REMOVE` and `OPTIONS` with an alias as its `relatedId` applied through site config to a rendered `Slot`, form a describe of their own in `runtime/slots/Slot.test.tsx` beside #178's slot-alias tests; the `OPTIONS` case reads the options back through `useWidgetOptions` in the aliased widget. Every test name says which operation it runs.

</details>

<details>
<summary>Manual testing</summary>

What the automated suite cannot show: the slot showcase rendering in a browser with its relative operations retargeted at widget id aliases, through the dev server and the real site config path.

## Environment

- The frontend-base checkout on `widget-id-aliases` at `565a8a9`, `npm run dev` (builds, then serves the shell's dev site at `http://apps.local.openedx.io:8080`).
- A browser on `/slots` (the slot showcase). The four sections under "UI Widget Operations" that use a `relatedId` are "Slot with inserted elements", "Slot with replaced element", "Slot with removed element" and "Slot with widget options (default)".
- One local, uncommitted edit to `shell/dev/slotShowcase/app.tsx` for the alias boxes: the four targeted widgets (`insertingChild2`, `replacingChild2`, `removingChild2`, `widgetOptionsChild2`) gain an `idAliases` of their own id with `.legacy` appended, and the five `relatedId`s (both inserts, the replace, the remove, the options) point at those `.legacy` ids. No widget id changes. As a change indicator, the "UI Widget Operations" heading in `shell/dev/slotShowcase/SlotShowcasePage.tsx` becomes "UI Widget Operations (alias edit live)". Reverted at the end.

## Verify by hand

- [x] **Baseline, unedited** — load `/slots`. Inserted: Widget One, Widget Five (`WidgetOperationTypes.INSERT_BEFORE`), Widget Two, Widget Four (`WidgetOperationTypes.INSERT_AFTER`), Widget Three. Replaced: Widget One, Widget Four (`WidgetOperationTypes.REPLACE`), Widget Three. Removed: Widget One, Widget Three. Widget options: Foo, Bar.
- [x] **The edit is live** — apply the edit, reload. The heading reads "UI Widget Operations (alias edit live)". Note whether the dev server rebuilt on its own or needed a restart.
- [x] **`INSERT_AFTER` and `INSERT_BEFORE` through the alias** — "Slot with inserted elements" is unchanged from the baseline: Widget One, Widget Five, Widget Two, Widget Four, Widget Three.
- [x] **`REPLACE` through the alias** — "Slot with replaced element" is unchanged: Widget One, Widget Four, Widget Three.
- [x] **`REMOVE` through the alias** — "Slot with removed element" is unchanged: Widget One, Widget Three.
- [x] **`OPTIONS` through the alias** — "Slot with widget options (default)" is unchanged: Foo, Bar.
- [x] **Control: an id nothing declares is a no-op** — change the `REMOVE` operation's `relatedId` from `...removingChild2.legacy` to `...removingChild2.missing`, reload. "Slot with removed element" shows Widget One, Widget Two, Widget Three. So the previous box matched through the alias and nothing else.
- [x] **Clean up** — `git checkout -- shell/dev/slotShowcase`; `git status` reports a clean tree.

## Left to the automated suite

- Each relative operation against an alias and against the primary id, `byId` and `withoutId`, precedence when an id and an alias both match, `identified` carrying `idAliases`: `runtime/slots/widget/utils.test.tsx`.
- The sort placing operations that target the alias or the id after the operation declaring the widget, and `useWidgetOptions` reading aliases from `WidgetContext`: `runtime/slots/widget/hooks.test.tsx`.
- Each of the five operations against an alias through site config on a rendered `Slot`: `runtime/slots/Slot.test.tsx`.

## Results

**2026-10-30, Brian.** All eight boxes passed on the dev site at `565a8a9`. Baseline matched. After the edit the dev server rebuilt on its own; a browser refresh, with no restart, showed the "(alias edit live)" heading, and all four sections rendered exactly as the baseline, so both inserts, the replace, the remove and the options each applied through the alias. Control: with the `REMOVE` pointed at `removingChild2.missing`, Widget Two came back. Clean up left a clean tree.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
