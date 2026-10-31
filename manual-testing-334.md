# Manual testing — widget `idAliases` (openedx/frontend-base#334)

Shell dev site, slot showcase page, branch `widget-id-aliases` at `565a8a9`. The showcase's four relative-operation sections are retargeted at aliases through a local, uncommitted edit; with aliases working, every section renders exactly as it does unedited. "Observed" lines are filled in during the pass; a step not watched says so.

## Setup

1. In the frontend-base checkout on `widget-id-aliases`: `nvm use`, then `npm run dev`. Open `http://apps.local.openedx.io:8080/slots`.
   Observed:

## Baseline, unedited

2. Under "UI Widget Operations", the four sections render these widgets, in this order, left to right:
   - "Slot with inserted elements": Widget One, Widget Five (`WidgetOperationTypes.INSERT_BEFORE`), Widget Two, Widget Four (`WidgetOperationTypes.INSERT_AFTER`), Widget Three.
   - "Slot with replaced element": Widget One, Widget Four (`WidgetOperationTypes.REPLACE`), Widget Three.
   - "Slot with removed element": Widget One, Widget Three.
   - "Slot with widget options (default)": Foo, Bar.
   Observed:

## Aliases

3. Edit `shell/dev/slotShowcase/app.tsx`, uncommitted: give the four targeted widgets (`insertingChild2`, `replacingChild2`, `removingChild2`, `widgetOptionsChild2`) an `idAliases` of their own id with `.legacy` appended, and point the five `relatedId`s (both inserts, the replace, the remove, the options) at those `.legacy` ids. No widget id changes. Reload the page.
   Observed (note whether the dev server picked the edit up on its own or needed a restart):
4. "Slot with inserted elements": Widget One, Widget Five (`INSERT_BEFORE`), Widget Two, Widget Four (`INSERT_AFTER`), Widget Three. Both inserts landed through the alias.
   Observed:
5. "Slot with replaced element": Widget One, Widget Four (`REPLACE`), Widget Three.
   Observed:
6. "Slot with removed element": Widget One, Widget Three.
   Observed:
7. "Slot with widget options (default)": Foo, Bar. The options reached the second widget through its alias.
   Observed:

## Control

8. Change the `REMOVE` operation's `relatedId` from `...removingChild2.legacy` to `...removingChild2.missing`, an id nothing declares, and reload. "Slot with removed element" shows Widget One, Widget Two, Widget Three: the operation is a no-op, so step 6 was the alias at work and not a match on anything else.
   Observed:

## Clean up

9. `git checkout -- shell/dev/slotShowcase/app.tsx`; `git status` reports a clean tree.
   Observed:
