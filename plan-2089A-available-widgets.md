# #2140: make `getAvailableWidgets` ask every widget again

## Context

#2140 (`bsmith/coursewaremeta-query-reads`) switches `SidebarProvider`
(`src/courseware/course/sidebar/SidebarContext.tsx`) from `useModel('coursewareMeta')` to
the typed `useCoursewareMetadata(...).data`, and added:

```ts
if (!coursewareMetadata || !courseHomeMeta) {
  return [];
}
```

It added the guard only to satisfy `npm run types`, and it changes what the function
does: with either metadata query missing, no widget is asked. We want a faithful port
instead.

## What `getAvailableWidgets` / `isAvailable` are, and who uses them

- **Widgets:** `Course.jsx` passes `getEnabledWidgets()` (`sidebar/defaultWidgets.js`).
  That's the two built-ins (discussions, upgrade) plus **every operator widget in
  `getConfig().SIDEBAR_WIDGETS`**, usually from `env.config.jsx`, which is plain
  JavaScript.
- **`getAvailableWidgets`** filters them: a widget with no `isAvailable` is always
  available; otherwise it calls `isAvailable({ courseId, unitId, course, unit })`.
- **Its callers** (`sidebar/hooks/`):
  - `useInitialSidebar` uses it for the stored preference and the priority cascade.
  - `useUnitShiftBehavior` uses it on each unit change. Its CASE 2 keeps a panel open
    provisionally because "data might still be loading".
  - `availableSidebarIds` renders the triggers.

  All of them re-run when its inputs change. The framework is built for availability
  that changes as data arrives.
- **The documented contract** (`sidebar/README.md`):
  - Line 23: "the first availability check runs before the data arrives, and when the
    query resolves the framework re-evaluates availability".
  - The examples guard with `course?.someField`.
  - "Example 1" is an operator widget that checks only `courseId`.
  - Line 52: "the sidebar makes no assumptions about which fields any given widget
    requires."

## History

| When | Availability logic | What `isAvailable` received | A missing model |
|---|---|---|---|
| before #1885 | coded in the provider and triggers: discussions `topic.id && enabledInContext`; notifications `verifiedMode` from `useModel('courseHomeMeta')` | — | — |
| #1885 (2026-04) | registry + `isAvailable`; built-ins: discussions reads `unit`, upgrade reads `course.verifiedMode` (**course-home** field) | `course: { ...coursewareMeta, ...courseHomeMeta }`, both `useModel` | `{}` → every widget still asked |
| #1897, #1899, `f34f95e5`, #2068 | prefetch moved, registry made backward compatible, docs, topics fetched by React Query | unchanged | unchanged |
| #2110 (09-23) | — | `courseHomeMeta` from the query (`undefined` when missing) | spreading `undefined` adds nothing → unchanged |
| #2113 (09-28) | TS: `isAvailable?: (ctx: SidebarWidgetContext) => boolean`, `course: CourseHomeMeta & CoursewareMeta` (#2111 decision 6: "not `Partial`: the provider renders under the gate") | unchanged; `coursewareMeta` still `any`, so the declaration was never checked | unchanged |
| #2116, #2122 (09-28) | `unit` typed, then from the query | — | unchanged |
| **#2140** | — | `coursewareMetadata` typed → the declaration is checked for the first time → guard added | **no widget asked** |

Two things run through every row. `isAvailable` was always handed whatever metadata was
loaded, and each widget decided for itself. And the outline's fields (`title`,
`sectionIds`, `hasScheduledContent`) reached `course` through the store's merge:
- **Thunk era:** always present, because the page waited for the outline.
- **Since #2074:** missing on the courseware page until the outline lands.
- **#2140:** the same, via `minimalCourseMetadata`.

## Reachability

- `SidebarProvider` renders only in `Course.jsx`, under TabPage's gate on both metadata
  queries, in every era.
- Nothing removes or resets those queries. Only `invalidateQueries` touches them
  (`useIFrameBehavior.ts`), and it keeps the data.
- So in the app, the guard never fires. Rows where a metadata query is missing are
  reached only by something rendering `SidebarProvider` directly (tests today).
- #2140 still changes the function's contract: an operator widget that ignores `course`
  (README Example 1) would be hidden in those rows, where #1885 → master showed it.

## Approach

1. **Remove the early return, so the runtime matches #1885 → master exactly.** Every
   widget, built-in or from `SIDEBAR_WIDGETS`, is asked with whatever is loaded:
   ```ts
   course: { ...coursewareMetadata, ...minimalCourseMetadata, ...courseHomeMeta },
   ```
   Spreading `undefined` adds nothing, as `{}` did.
2. **Type: loosen only the parameter `isAvailable` receives; leave the exported
   `SidebarWidgetContext` unchanged.**
   - Add a local, unexported named type in `SidebarContext.tsx` for what `isAvailable`
     is handed. Its `course` is the type of the spread itself, derived from a local
     function the provider also calls, so the type and the object can't drift apart:
     ```ts
     const buildWidgetCourse = (
       coursewareMetadata?: CoursewareMeta,
       minimalCourseMetadata?: MinimalCourseMetadata,
       courseHomeMeta?: CourseHomeMeta,
     ) => ({ ...coursewareMetadata, ...minimalCourseMetadata, ...courseHomeMeta });

     type SidebarAvailabilityContext = Omit<SidebarWidgetContext, 'course'> & {
       course: ReturnType<typeof buildWidgetCourse>;
     };
     ```
     Each field is optional, and a field both endpoints carry is typed as either
     endpoint's. `Partial` of the intersection fails on `celebrations`: the intersection
     types it as the course-home shape, but with the course-home metadata missing the
     value is the courseware metadata's, which is `unknown`. A shallow
     `Partial<SidebarWidgetContext>` fails too (`course?` must still be complete). Both
     were tried.
   - **The exported `SidebarWidgetContext.course`** gains `& Partial<MinimalCourseMetadata>`,
     naming the outline's fields as optional. This is additive, and the shared `id` and
     `title` stay `string`.
   - `SidebarWidget.isAvailable` and `SidebarRegistryEntry.isAvailable`
     (`SidebarContext.tsx:45`) take `(context: SidebarAvailabilityContext) => boolean`.
   - The two built-ins type themselves from the slot they fill, through the exported
     `SidebarWidget`, and drop their `SidebarWidgetContext` import:
     - `discussionsIsAvailable` (`widgets/discussions/widgetConfig.ts`) becomes
       `discussionsIsAvailable: NonNullable<SidebarWidget['isAvailable']> = ({ unit }) => …`;
     - `upgradeIsAvailable` (`widgets/upgrade/src/utils.ts`) the same way.

     This matters because `@edx/typescript-config` sets `strictFunctionTypes: false`
     (bivariant parameters). Built-ins still annotated `(ctx: SidebarWidgetContext)`
     would compile against the looser slot while claiming a complete `course`. Taking
     the slot's type keeps #2111 decision 9's check: a built-in's own function is typed
     against what it's handed.
   - **Otherwise unchanged:** `SidebarWidgetContext` stays exported, with only the
     additive outline fields, for TypeScript plugins that import it. It's now the base of
     the local type and has no in-repo importers. A TypeScript plugin whose `isAvailable` is annotated
     `(ctx: SidebarWidgetContext)` still compiles, because of the same bivariance.
     JavaScript `env.config.jsx` widgets never saw the type.
   - This departs from #2111 decision 6 ("not `Partial`: the provider renders under
     the gate"). That argument describes the page. The contract `isAvailable` documents
     (README line 23: "the first availability check runs before the data arrives")
     describes the function, and the parameter type follows the function.
3. **Tests in `SidebarContext.test`**, rendering the real provider with one metadata
   query left empty:
   - **Course-home metadata empty:** a widget with no `isAvailable`, and an
     operator-style widget checking only `courseId`, are still available. Upgrade isn't,
     because `verifiedMode` is a course-home field.
   - **Courseware metadata empty:** the same widgets as when both are loaded, upgrade
     included, since no built-in reads the courseware metadata.

   Negative check: with the guard restored, both cases fail.
4. **Decision doc:** rewrite decisions-2089A entry 4 with:
   - the history above;
   - the reachability;
   - why the early return goes;
   - why only `isAvailable`'s parameter loosens (the local type, the built-ins typed
     from the slot, `strictFunctionTypes: false`);
   - where this departs from #2111 decision 6.

   Add a type-only line to #2140's operators-breaking notes: in a TypeScript plugin
   typed from `SidebarWidget['isAvailable']`, `course`'s fields become optional. Re-sync
   #2140's PR body later.

**Out of scope, to raise separately:** operator widgets whose `isAvailable` reads the
outline's fields have seen them missing on the courseware page while the outline is
pending since #2074. In the thunk era they were always present. They're re-evaluated
when the outline lands. This is #2138's family, but the sidebar isn't covered by #2139.

## Verification

- `nvm use && npm run types`, `npm run lint`, and `npm run test` (the full suite).
- The new `SidebarContext.test` cases pass, and fail with the guard restored.
- Negative type check: inside `upgradeIsAvailable`, a temporary
  `const org: string = course.org` fails `npm run types` (`string | undefined`), which
  confirms the slot's partial `course` reaches the built-ins.
- Manual, tutor local: the courseware sidebar shows the same triggers as before
  (upgrade for a learner with `verifiedMode`, discussions on a unit with a topic).
