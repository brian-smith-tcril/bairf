# Manual testing — widget `idAliases` (openedx/frontend-base#334)

What the automated suite cannot show: the slot showcase rendering in a browser with its relative operations retargeted at widget id aliases, through the dev server and the real site config path.

## Environment

- The frontend-base checkout on `widget-id-aliases` at `565a8a9`, `npm run dev` (builds, then serves the shell's dev site at `http://apps.local.openedx.io:8080`).
- A browser on `/slots` (the slot showcase). The four sections under "UI Widget Operations" that use a `relatedId` are "Slot with inserted elements", "Slot with replaced element", "Slot with removed element" and "Slot with widget options (default)".
- One local, uncommitted edit to `shell/dev/slotShowcase/app.tsx` for the alias boxes: the four targeted widgets (`insertingChild2`, `replacingChild2`, `removingChild2`, `widgetOptionsChild2`) gain an `idAliases` of their own id with `.legacy` appended, and the five `relatedId`s (both inserts, the replace, the remove, the options) point at those `.legacy` ids. No widget id changes. As a change indicator, the "UI Widget Operations" heading in `shell/dev/slotShowcase/SlotShowcasePage.tsx` becomes "UI Widget Operations (alias edit live)". Reverted at the end. The edit as a diff:

  ```diff
  diff --git a/shell/dev/slotShowcase/SlotShowcasePage.tsx b/shell/dev/slotShowcase/SlotShowcasePage.tsx
  index 8f300738..66ef20c8 100644
  --- a/shell/dev/slotShowcase/SlotShowcasePage.tsx
  +++ b/shell/dev/slotShowcase/SlotShowcasePage.tsx
  @@ -93,7 +93,7 @@ export default function SlotShowcasePage() {
           </SlotContainer>
         </Section>
   
  -      <h2 className="showcase-divider">UI Widget Operations</h2>
  +      <h2 className="showcase-divider">UI Widget Operations (alias edit live)</h2>
   
         <Section title="Slot with prepended element">
           <p>This slot has a prepended element (and two appended elements).</p>
  diff --git a/shell/dev/slotShowcase/app.tsx b/shell/dev/slotShowcase/app.tsx
  index f5ddb4bd..678885a3 100644
  --- a/shell/dev/slotShowcase/app.tsx
  +++ b/shell/dev/slotShowcase/app.tsx
  @@ -191,14 +191,14 @@ const app: App = {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseInserting',
         id: 'slot-showcase.inserting.child4',
         op: WidgetOperationTypes.INSERT_AFTER,
  -      relatedId: 'org.openedx.frontend.widget.slotShowcase.insertingChild2',
  +      relatedId: 'org.openedx.frontend.widget.slotShowcase.insertingChild2.legacy',
         element: (<Widget title="Widget Four" op="WidgetOperationTypes.INSERT_AFTER" />)
       },
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseInserting',
         id: 'slot-showcase.inserting.child5',
         op: WidgetOperationTypes.INSERT_BEFORE,
  -      relatedId: 'org.openedx.frontend.widget.slotShowcase.insertingChild2',
  +      relatedId: 'org.openedx.frontend.widget.slotShowcase.insertingChild2.legacy',
         element: (<Widget title="Widget Five" op="WidgetOperationTypes.INSERT_BEFORE" />)
       },
       {
  @@ -210,6 +210,7 @@ const app: App = {
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseInserting',
         id: 'org.openedx.frontend.widget.slotShowcase.insertingChild2',
  +      idAliases: ['org.openedx.frontend.widget.slotShowcase.insertingChild2.legacy'],
         op: WidgetOperationTypes.APPEND,
         element: (<Widget title="Widget Two" />)
       },
  @@ -230,6 +231,7 @@ const app: App = {
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseReplacing',
         id: 'org.openedx.frontend.widget.slotShowcase.replacingChild2',
  +      idAliases: ['org.openedx.frontend.widget.slotShowcase.replacingChild2.legacy'],
         op: WidgetOperationTypes.APPEND,
         element: (<Widget title="Widget Two" />)
       },
  @@ -243,7 +245,7 @@ const app: App = {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseReplacing',
         id: 'org.openedx.frontend.widget.slotShowcase.replacingChild4',
         op: WidgetOperationTypes.REPLACE,
  -      relatedId: 'org.openedx.frontend.widget.slotShowcase.replacingChild2',
  +      relatedId: 'org.openedx.frontend.widget.slotShowcase.replacingChild2.legacy',
         element: (<Widget title="Widget Four" op="WidgetOperationTypes.REPLACE" />)
       },
   
  @@ -257,6 +259,7 @@ const app: App = {
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseRemoving',
         id: 'org.openedx.frontend.widget.slotShowcase.removingChild2',
  +      idAliases: ['org.openedx.frontend.widget.slotShowcase.removingChild2.legacy'],
         op: WidgetOperationTypes.APPEND,
         element: (<Widget title="Widget Two" />)
       },
  @@ -269,7 +272,7 @@ const app: App = {
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseRemoving',
         op: WidgetOperationTypes.REMOVE,
  -      relatedId: 'org.openedx.frontend.widget.slotShowcase.removingChild2',
  +      relatedId: 'org.openedx.frontend.widget.slotShowcase.removingChild2.legacy',
       },
   
       // Widget Options
  @@ -282,12 +285,13 @@ const app: App = {
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseWidgetOptions',
         id: 'org.openedx.frontend.widget.slotShowcase.widgetOptionsChild2',
  +      idAliases: ['org.openedx.frontend.widget.slotShowcase.widgetOptionsChild2.legacy'],
         op: WidgetOperationTypes.APPEND,
         component: WidgetWithOptions,
       },
       {
         slotId: 'org.openedx.frontend.slot.dev.slotShowcaseWidgetOptions',
  -      relatedId: 'org.openedx.frontend.widget.slotShowcase.widgetOptionsChild2',
  +      relatedId: 'org.openedx.frontend.widget.slotShowcase.widgetOptionsChild2.legacy',
         op: WidgetOperationTypes.OPTIONS,
         options: {
           title: 'Bar',
  ```

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
