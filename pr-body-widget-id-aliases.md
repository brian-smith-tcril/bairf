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

`npm run typecheck`, `npm run lint` and `npm test` pass (63 suites, 566 tests). No manual pass: nothing in the dev site declares an alias, and the first consumer check is openedx/frontend-app-learner-dashboard#878 adopting aliases for its two renamed header link ids.

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

🤖 Generated with [Claude Code](https://claude.com/claude-code)
