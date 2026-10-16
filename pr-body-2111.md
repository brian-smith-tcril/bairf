## Summary

The courseware sidebar's `SidebarContextProvider` becomes TypeScript, and the two patterns in it that predate React Query go with the conversion rather than being typed around: the context's default object, which let a consumer outside the provider render empty instead of failing, and the `prefetch` effect that read the merged course metadata through a ref (`courseMetaRef`) to avoid duplicate requests — PR #1897's fix, approved then as "a bit hacky. The real solution is going to be moving to React Query, later on." The discussions widget now loads its topics as a React Query observer in a `Provider`, gated with `enabled`, and the `prefetch` field leaves the widget contract. The contract gets named types — `SidebarWidget`, `SidebarWidgetContext`, `SidebarContextValue` in `SidebarContext.ts` — that the README points at instead of restating, and both built-in widget configs are declared against them. **One user-facing fix and no request-count change**: a sidebar panel opened on a narrow viewport now restores after a refresh, which it never has on `master` (the provider's first render ran before Paragon had measured the window and seeded the closed state; decision 10). Otherwise one topics request per sidebar mount, as before, and none on a metadata write. **Breaking for operators**: the `prefetch` widget-config field is removed and `useContext(SidebarContext)` outside the sidebar returns `null` — see *Operators — breaking* below. Part of the Redux → React Query migration (#1946, Stage 1); peeled out of #2087 so that layer changes the declared type of one field. Closes #2111.

## What changed

- **The discussions prefetch is a query observer.** `widgets/discussions/DiscussionsProvider.tsx` calls `useQuery` on `discussionTopicsQuery(courseId)` with `enabled: !!DISCUSSIONS_MFE_BASE_URL && hasDiscussionTab(tabs)` — the gate `discussionsPrefetch` applied — mounted through the contract's existing `Provider` field, which the framework wraps around the sidebar children for every enabled widget whether or not it is available. An observer fetches on mount and on key change, not when the metadata it reads re-renders, so the case the ref protected against (a re-fire after a `courseHomeMeta` write) is handled by the model. `prefetchDiscussionTopics` and `discussionsPrefetch` are deleted; the query definition is a `queryOptions` object exported from `courseware/data/apiHooks.ts`, and its bridge `meta` stays until #2087 converts the three `useModel` readers.
- **The provider loses the effect, `courseMetaRef`, the second merge and `useQueryClient`.** `course` is built once, in `getAvailableWidgets`, as in #1885.
- **`SidebarContext.ts`.** `createContext<SidebarContextValue | null>(null)` plus a throwing `useSidebar()`, the `ToastContext` shape; exports `SidebarWidget`, `SidebarWidgetContext` (`course: CourseHomeMeta & CoursewareMeta`, `unit: Partial<DiscussionTopic>`) and `SidebarContextValue`. `CoursewareMeta` and `DiscussionTopic` are added beside their queries in `courseware/data/apiHooks.ts`, the way #2109 added `CourseHomeMeta`.
- **`SidebarContextProvider.tsx`.** A `Props` interface, typed refs, `enabledWidgets` typed `SidebarWidget[]` so the compiler checks the `isAvailable` context literal, Paragon's breakpoint constant asserted, and the first render reads `useWindowSize().width ?? window.innerWidth` — which fixes a `master` bug where a sidebar panel opened on a narrow viewport did not restore after a refresh (decision 10). The four sidebar hooks convert with it, their JSDoc `@param` blocks (which had typed the refs as `Function`/`Object`) becoming `Params` interfaces; `priority` is required on `SidebarWidget`, as the contract always documented.
- **Both built-in widget configs are TypeScript**, declared `SidebarWidget`, with `discussionsIsAvailable` and `upgradeIsAvailable` taking `SidebarWidgetContext`; `UpgradeWidgetContext.tsx` converts with them (its `propTypes`-inferred `children` did not fit the `Provider` type).
- **Docs.** `sidebar/README.md`'s *Widget Structure* and *Context Object* become import lines plus one annotated example, *The `prefetch` field* is gone and *The `Provider` field* covers its subject, showing `DiscussionsProvider` as the data-loading use; consumer examples use `useSidebar()`. `ARCHITECTURE.md`, `USE_CASE_VERIFICATION.md`, the discussions README and the upgrade README follow.
- **Tests.** `DiscussionsProvider.test.tsx` replaces `widgetConfig.test.ts`: the same gates measured as requests, plus *does not load the topics again when the course metadata changes* — the #1897 case, pinned. `SidebarContext.test.tsx` covers the hook's throw. Three suites that rendered a context consumer without a provider (`LockPaywall`, `SequenceNavigation`, `SequenceNavigationTabs`) get one; they were found by running the suite with the default removed.

## Operators — breaking

**The `prefetch` field of a `SIDEBAR_WIDGETS` entry is no longer called.** A widget that loaded data through it loads it in a `Provider` component instead, as a React Query observer gated with `enabled`; the framework mounts every enabled widget's `Provider` inside `SidebarContext` whether or not the widget is available, so the data loads before the widget's trigger can render, as `prefetch` did. The discussions widget is the built-in example:

```js
import { useQuery } from '@tanstack/react-query';
import { useSidebar } from './src/courseware/course/sidebar/SidebarContext';

const MyWidgetProvider = ({ children }) => {
  const { courseId } = useSidebar();
  useQuery({ ...myWidgetDataQuery(courseId), enabled: someCondition });
  return <>{children}</>;
};

export const myWidgetConfig = { id: 'MY_WIDGET', Provider: MyWidgetProvider, /* … */ };
```

**`useContext(SidebarContext)` returns `null` outside `SidebarProvider`.** Under the sidebar — where every widget component renders — nothing changes; `useSidebar()` from the same module is the typed read and throws a readable error if a component is rendered outside it. A widget's `isAvailable` still receives `{ courseId, unitId, course, unit }` with the same values as before; the shape is now the exported `SidebarWidgetContext` type, and the sidebar README's *Widget Structure* and *Context Object* sections point at the declarations.

## Testing

`npm run types` and `npm run lint` clean; full suite 117 suites, 1173 passed, 0 skipped (on #2118, which un-skips three); `SidebarContextProvider.tsx` at 100% lines and branches under its own suite. Negative check: removing `unit` from the provider's `isAvailable` context literal fails `npm run types` ("not assignable to parameter of type 'SidebarWidgetContext'"). The suites that needed a provider were identified by running the suite with the context default removed before adding any: exactly `LockPaywall`, `SequenceNavigation` and `SequenceNavigationTabs` failed. Manual testing per the checklist below, on tutor dev: 8 of 11 checks run, all passing — one `v1/courses` and one `v2/course_topics` request per hard reload and none added by unit or sequence navigation, the trigger and panel present on a unit with a topic and absent on one without, the stored-preference auto-open, a console clean of `useSidebar` and null-destructure errors, and an `env.config.jsx` probe widget whose `prefetch` never fires while its `Provider` mounts. Not run: the celebration-write case (needs a fresh enrolment with celebrations on; pinned by the `DiscussionsProvider` test), the upgrade trigger (needs a paid track; the widget's runtime is unchanged), and a legacy-provider course (none local; covered by the query's legacy case).

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — clean up `SidebarContextProvider` for React Query and convert it to TypeScript (#2111)

Peeled out of #2087 (layer C of the #1977 model-store dissolution); the
second layer of the stack that follows the fully landed #2080, above the
test-only #2118 layer inserted in review on 2026-09-25. Entries 1–9 were
settled in the plan review on 2026-09-24 and posted to #2111; the rest landed
with the code.

1. **A deep layer, peeled out of a wide one.** #2087 swaps three
   `useModel('discussionTopics')` readers lightly — a wide layer. One of them
   is the provider's `unit`, which it hands to every widget's `isAvailable`
   under a README contract that types it only as `unit: object`, so the
   "`undefined` or `{}` for a unit with no topic" question had no honest home
   in a README comment. This layer converts the provider and gives the widget
   contract named types, so #2087 changes the declared type of one field.
   Few files, every change in them the right one.

2. **Not a plain `.jsx → .tsx` pass.** The first draft was "only what the
   compiler forces"; rejected in review. Typing the file as it stood meant
   typing around two patterns that exist only because it predates React
   Query — a context created with a default object, and an effect that reads
   the merged metadata through a ref to avoid re-firing — and the reason not
   to do a plain conversion is exactly that we would be hacking around
   patterns that no longer make sense just to make the types work. Both go
   here; the types describe the file as it should be.

3. **The context has no default value; `useSidebar()` throws outside
   the provider.** `createContext` had a default object, so
   `useContext(SidebarContext)` outside `SidebarProvider` returned
   `{ currentSidebar: null, …, availableSidebarIds: [] }` and the consumer
   rendered empty with no error. Every consumer in the app is under the
   provider (`Course.jsx`), so the default was read only by tests that
   rendered a consumer bare — and it hid exactly the mistake a context should
   report. Now `createContext<SidebarContextValue | null>(null)` plus a hook
   with a readable error, the `ToastContext` shape. The hook was first
   named `useSidebarContext`; renamed in review to `useSidebar` to match the
   repo's four typed contexts (`useToast`, `usePluginOverrides`,
   `useCoursewareSearch`, `useTourState`), which name what the hook gives
   you, not the mechanism. `SidebarContext` stays
   exported: the built-in widgets, `LockPaywall`, `SidebarBase` and the two
   hooks files still call `useContext(SidebarContext)` — a `null` on the
   destructure is the loud failure wanted, and those files convert to the
   hook as their own layers touch them; `SidebarContext.Provider` is how
   tests supply a value. First adopters of the hook: `DiscussionsProvider`
   and `UpgradeWidgetContext`. The suites that rendered a consumer without a
   provider were found by running the suite with the default removed before
   any provider was added: `LockPaywall.test.jsx`,
   `SequenceNavigation.test.jsx` and `SequenceNavigationTabs.test.jsx` (both
   reach `useIsSidebarOpen` in `sequence-navigation/hooks.js`). The plan's
   static count had `UnitNavigation.test.jsx` and five bare renders in
   `Sequence.test.jsx` instead of the tabs suite; neither reaches a consumer,
   and the tabs suite does. Each got a `SidebarContext.Provider` with the two
   fields its consumer reads, the partial-`value` shape the widget suites use.

4. **The prefetch effect and `courseMetaRef` are replaced by a query
   observer in the discussions widget's `Provider`.** How it worked: the
   provider ran every widget's `prefetch` from an effect keyed on `courseId`
   and the widget list, reading the merged course metadata through a ref
   assigned every render. Why: PR #1897's first version had the effect depend
   on the two metadata models; `arbrandes` requested changes because the
   models settled in separate React batches on initial load, so the effect
   fired twice and the thunk fetched twice ("two requests to each endpoint
   returning identical data"), and suggested a ref; his approval read "the
   `ref` workaround solves it, but it's a bit hacky. The real solution is
   going to be moving to React Query, later on." What React Query changed:
   under B3 the provider renders after the gate, so both metadata sources are
   present at first render (no two-batch double fire), and `queryClient.query`
   dedupes an in-flight request. What it did not change: at `staleTime: 0` a
   fire after settlement refetches, and the merge *does* change after first
   render — the celebration writers B3 moved onto `setQueryData` give
   `courseHomeMeta` a new reference — so simply depending on the merge again
   would trade duplicate requests on load for a new topics request on every
   metadata write. The fix is the model's own: an observer with `enabled`
   fetches on mount and on key change, not when the metadata it reads
   re-renders. `DiscussionsProvider` observes `discussionTopicsQuery(courseId)`
   with `enabled: !!DISCUSSIONS_MFE_BASE_URL && hasDiscussionTab(tabs)`, the
   same gate `discussionsPrefetch` applied, mounted through the contract's
   existing `Provider` field — which the framework wraps around the sidebar
   children for every enabled widget, inside `SidebarContext`, whether or not
   the widget is available. Same post-mount timing as the effect, one
   request per sidebar mount, none on a metadata write (pinned by a test).
   The bridge `meta` stays on the query definition until #2087 converts the
   three readers.

5. **The `prefetch` field leaves the widget contract — breaking.** Why it
   existed: before #1897 `DiscussionsTrigger` fetched its own topics, but the
   framework mounts a trigger only when its widget is available and the
   discussions widget's availability depends on the topics, so the fetch
   moved to framework level, run for every enabled widget regardless of
   availability. In a Redux world "load data" was "dispatch a thunk", a plain
   function call, so it became a callback given `dispatch` (later
   `queryClient`, #2016) and `course`; `Provider`, added days earlier in
   #1885, was framed as panel↔trigger shared state, not data. With React
   Query, loading is a hook and needs a component; the framework already
   mounts one per enabled widget regardless of availability — `Provider`.
   Same idea, React Query's shape, no ref. Keeping `prefetch` for a
   hypothetical external widget would keep the effect and the ref for no
   in-repo caller, two ways to do one thing with the older one needing the
   workaround. Removed, with `courseMetaRef`, the second merge and
   `useQueryClient` in the provider; `refactor!:` with a footer naming the
   field and its replacement. The field had already changed shape once with
   no external consumer found (#2016, `dispatch → queryClient`).

6. **`course: CourseHomeMeta & CoursewareMeta`, inline.** The merge
   `{ ...coursewareMeta, ...courseHomeMeta }` is two endpoints with a modest
   overlap (`id`, `title`, `start`, `celebrations`, `isEnrolled`,
   `userTimezone`); the `courseware/course/{id}` payload has ~30 fields the
   `course_metadata` payload does not (`enrollmentMode`, `accessExpiration`,
   `userNeedsIntegritySignature`, `entranceExamData`, …) and vice versa
   (`tabs`, `org`, `isStaff`, `verifiedMode`, `courseAccess`, …). The first
   draft declared `CourseHomeMeta` alone on the strength of its index
   signature; review asked whether the course-home payload is a superset —
   it is not — so that was half a type under the wrong endpoint's name. A
   sidebar-local alias (`SidebarCourse`) to keep "course home" out of a
   courseware contract was offered and rejected as a second name for the
   same thing. `CoursewareMeta` is added to `courseware/data/apiHooks.ts`
   the way B2 added its counterpart: an index-signature interface and the
   type parameter on `useCoursewareMetadata`; it starts as the index
   signature alone because no TypeScript reader of that payload exists yet
   (D3 names fields as its readers convert), `getCourseMetadata` returns
   `any` so the annotation is accepted, and no caller reads `.data` today.
   Not `Partial`: the provider renders under the gate (`LoadedTabPage`
   throws unless the metadata query is in success), so `courseHomeMeta` is
   defined at every render in the app. Spreading the `any` `coursewareMeta`
   makes the literal `any`, so the compiler accepts the declaration rather
   than deriving it; the declaration is the statement.

7. **`unit: Partial<DiscussionTopic>` — the honest type of today's value, and
   the line #2087 changes.** `useModel('discussionTopics', unitId)` returns
   the topic or `{}`; both are `Partial<DiscussionTopic>`, and
   `unit?.id && unit?.enabledInContext` type-checks against it.
   `DiscussionTopic` (`id`, `usageKey`, `enabledInContext`, index signature)
   is added beside the query that produces it in `courseware/data/apiHooks.ts`,
   replacing the inline `{ usageKey: string | null }[]` annotation; #2087's
   `select` reuses it. When #2087's hook returns `undefined` for a unit with
   no topic, the declaration becomes `unit?: DiscussionTopic` — a change a
   widget author's editor shows, checked against the built-in widgets' own
   typed `isAvailable` parameters.

   **Where the two new types live, and why `courseware/data/apiHooks.ts` was
   not split.** `DiscussionTopic` and `CoursewareMeta` sit beside the queries
   that produce them, the repo's convention (`CourseHomeMeta` beside
   `useCourseHomeMeta`, `CourseOutlineData` in `courseOutline.ts`,
   `TabMetadata` in `course-tabs/utils.ts`); putting `DiscussionTopic` under
   `widgets/discussions/` would have the data layer import from a widget,
   which nothing else does. Review noted that `apiHooks.ts` has become a grab
   bag — three course-level queries, the sequence query, the sidebar outline
   query and its toggles, the topics query, four mutations, the types and
   `useSequenceIds` — and chose not to split it in this layer: no better
   shape is obvious yet, splitting a data module is not this layer's subject,
   and after #1977 removes the bridge entries and the D layers move the
   mutation writes onto the queries, the file's contents change enough that
   seams chosen now may not be the right ones. A per-concern split
   (`courseOutline.ts` is the existing example of the shape) is its own small
   layer when the shape is clear.

8. **One query definition, `discussionTopicsQuery(courseId)`, through
   `queryOptions`.** It is what the Provider observes, what #2087's reader
   hook will spread, and what the tests seed with. The `queryFn` body moved
   verbatim from `prefetchDiscussionTopics` (comment included); the bridge
   `meta` moved with it. `prefetchDiscussionTopics` and `discussionsPrefetch`
   are deleted. One test-visible difference: the prefetch swallowed
   rejections with `.catch(noop)`; `queryClient.query(discussionTopicsQuery(…))`
   rejects, so the config-failure case in `apiHooks.test.tsx` awaits
   `rejects.toThrow()` and then asserts what it did before (`logError`
   called through the QueryCache `onError`, nothing written). The three
   seeding suites swap one line each.

9. **Both built-in widget configs convert, and with them the upgrade widget's
   context module.** `widgets/discussions/widgetConfig.ts` changes anyway
   (`prefetch` out, `Provider` in) and is declared `SidebarWidget`, with
   `discussionsIsAvailable` taking `SidebarWidgetContext` — that is what
   makes the contract check a built-in's own function, not only the argument
   the provider hands it. `widgets/upgrade/src/widgetConfig.ts` and `utils.ts`
   convert the same way ("related enough"). `UpgradeWidgetContext.jsx` had
   to follow: its `propTypes` (`children: PropTypes.node.isRequired`) make
   TypeScript infer a `children: NonNullable<ReactNodeLike>` prop that is not
   assignable to `Provider?: ComponentType<{ children: ReactNode }>`. The
   alternatives were loosening the contract type to fit a JavaScript
   component's inferred props, or converting the component; it converted
   (`UpgradeWidgetContext.tsx`, the `ToastContext` shape, `useSidebar()`
   for `courseId`). Its JSDoc typedef became the real interface; its test is
   unchanged.

10. **The first render reads the real window width, and a stored sidebar
    preference now restores on a narrow viewport.** `useWindowSize` returns
    `width: number | undefined`, and it really is undefined on the first
    render: Paragon's hook initialises state undefined and measures in a
    layout effect (its comment: "so server and client renders match",
    Paragon #3125). `breakpoints.extraLarge.minWidth` is typed
    `minWidth?: number` because one `BreakpointRange` interface covers all
    six ranges and `extraSmall` has no `minWidth`; for `extraLarge` it is the
    constant `1200` (Paragon #3524). The old `width < breakpoints.extraLarge.minWidth`
    was therefore two type errors. Now:

    ```ts
    const width = useWindowSize().width ?? window.innerWidth;
    const shouldDisplayFullScreen = width < breakpoints.extraLarge.minWidth!;
    ```

    The `!` on the breakpoint states a fact about Paragon's constants — the
    shape this repo used for the same problem in February 2026 (`8d2347b7`,
    "always defined in practice"). The `?? window.innerWidth` is the value
    Paragon's layout effect is about to store, so the first render computes
    the same viewport branch the second will.

    **This one is a behaviour fix, found by review of the next layer.** The
    first version of this layer kept the JavaScript behaviour exactly —
    `width !== undefined && width < …`, `false` on the first render as
    `undefined < 1200` was — and recorded the fallback as "left for its own
    evidence": it had lived only in the `new-sidebar` TypeScript variant that
    #1885 deleted (Braden's #1572, a type fix for Paragon's new `undefined`,
    whose fallback happened to be the right runtime value), never in the
    JavaScript provider this file descends from, so adopting it was new
    behaviour for this file, and the desktop checks on hand passed. The
    evidence came from #2112's suites, the first to render the real
    provider on a narrow viewport with a stored preference: with the
    `false` first render, `useInitialSidebar` takes the desktop branch,
    sees `isInitiallySidebarOpen` false and returns `null`, which
    `useState(initialSidebar)` seeds `currentSidebar` with; after the layout
    effect measures, `initialSidebar` becomes the stored value, but on a
    narrow viewport `useSidebarSync` and `useUnitShiftBehavior` both return
    early by design ("MOBILE: persist state, no auto-switching"), so nothing
    corrects the seed. A learner who opens a panel on a phone and refreshes
    finds it closed, on `master` since #1885 — reproduced by hand on tutor
    dev 2026-09-24. On desktop the seed was being corrected in two hops
    (`useResponsiveBehavior` opens the outline and writes it to storage,
    then `useSidebarSync` switches to the stored panel and writes that),
    which is why #1923's desktop checks and #2113's manual test passed.
    With the fallback the seed is right on both viewports; desktop reaches
    the same end state in every case (nothing stored, a stored right panel,
    a stored outline, closed by user) without the transient outline render
    after first paint and without the two storage writes per load.
    `useInitialSidebar` treats "stored `COURSE_OUTLINE`" and "nothing stored"
    identically, so the missing write changes nothing later. Decided in
    review 2026-09-24 to land here rather than in #2112, since this layer
    owns the provider. Two drafts were rejected earlier: an `isWidthKnown`
    alias narrowing both operands (a runtime check of a constant that can
    never be undefined) and a named `extraLargeMinWidth` variable with a
    comment. A `width = 0` default would have flipped the first render the
    other way (`0 < 1200`).

    History for the record: before #1885 there were two providers, chosen
    at runtime by the `isNewDiscussionSidebarViewEnabled` course flag — the
    JavaScript `sidebar/SidebarContextProvider.jsx` (this file's lineage,
    bare comparison) and the TypeScript `new-sidebar/SidebarContextProvider.tsx`
    with the fallback and, later, the February `!`s. #1885 removed the flag
    and the `new-sidebar` tree.

11. **The sidebar hooks' JSDoc was wrong, TypeScript said so, and the hooks
    converted.** The project type-checks JavaScript through JSDoc, so
    `@param {Function} params.hasUserToggledRef` (`useSidebarSync`,
    `useResponsiveBehavior`) and `@param {Object} params.previousUnitIdRef`
    (`useUnitShiftBehavior`) rejected the typed refs the provider now passes.
    The first fix corrected the JSDoc in place (`{import('react').MutableRefObject<boolean>}`
    / `<string|null>`) and left the hooks JavaScript; review asked what a
    conversion would touch — nothing outside each hook: `hooks/index.js`
    re-exports by extension-less path, the provider already passes typed
    arguments, the tests are JavaScript and pass `{ current: false }` refs —
    and chose to convert all four (`useInitialSidebar`, `useUnitShiftBehavior`,
    `useSidebarSync`, `useResponsiveBehavior`, plus `hooks/index.ts`) so the
    directory is one thing. Each `@param` block became a `Params` interface;
    the descriptive JSDoc prose stays; bodies are byte-identical.
    `getAvailableWidgets` is typed `() => SidebarWidget[]`, which made the two
    `priority` comparisons (`firstAvailableWidget.priority < storedWidget.priority`)
    fail while `priority` was optional. It is now required on `SidebarWidget`:
    the contract always documented it as required (`priority: number` in the
    old README block), and `getEnabledWidgets`' `|| WIDGET_PRIORITIES.DEFAULT`
    stays as the runtime fallback for untyped configs. In the same vein, the old
    `SidebarContextValue` typedef in `SidebarContext.js` listed ten fields
    and omitted `availableSidebarIds`, which the default object below it
    and the provider's `contextValue` had carried since #1885 — a JSDoc
    typedef on a `createContext` call is never checked against the value.
    The interface names it (`string[]`), and the provider's
    `useMemo<SidebarContextValue>` now fails to compile without it. Two
    types were also narrowed on purpose rather than corrected: `Trigger` is
    `ComponentType<{ onClick: () => void }>` (the one way `SidebarTriggers`
    renders it; the README already said `onClick` is injected by the
    framework) and `Sidebar` is `ComponentType` with no props (`Sidebar.jsx`
    renders it bare), where the typedef had `React.ComponentType` for both.
    A widget whose Trigger or Sidebar needs another prop would render with
    it missing, which is what the narrower type catches — for TypeScript
    configs; the built-in components are still JavaScript, so their
    `propTypes` are not compared until they convert.

12. **`renderWithWidgetProviders` is one `reduceRight` with a conditional.**
    The `.filter(w => w.Provider).reduceRight(…)` shape left `Provider`
    possibly undefined inside the reduce for TypeScript; a type-guard filter
    or an assertion would have satisfied it. `(acc, { Provider }) =>
    (Provider ? <Provider>{acc}</Provider> : acc)` is the same behaviour with
    neither.

13. **The README links to the declarations instead of mirroring them.**
    *Widget Structure* and *Context Object* each become one sentence naming
    the type and linking `SidebarContext.ts`. The declarations carry no
    comments either: a first pass put one on each field the old README block
    had annotated, and review found them either derivable from code an author
    reads anyway (`getEnabledWidgets` shows the `priority` default and the
    `enabled !== false` rule), covered by the README (`Provider`), or
    describing a transitional value #2087 removes (`unit`'s `{}`); reading
    them alongside the types was more confusing than the types alone. The first version of each section also carried an
    `import type` line and a short annotated example config; review dropped
    them — the old sections were hand-written type definitions, and an
    example with a lone `priority` comment that disagreed with the field's
    own comment was drift starting on day one. Say it is the type, link it,
    stop. *The `prefetch` field* is gone and *The `Provider` field* absorbed
    its subject: the section now explains what a Provider is (always mounted
    while the sidebar is, inside `SidebarContext`), names its two uses with
    the built-in that does each — shared state (`UpgradeWidgetProvider`) and
    loading the data `isAvailable` depends on (`DiscussionsProvider`, with
    its code) — and keeps the config example. A first version put the
    discussions example in a separate *Loading widget data* section written
    in React Query terms ("an observer gated with `enabled` … fetches when it
    mounts and when its key changes, not when the metadata it reads
    re-renders"); review found it argued against a bug the reader had never
    heard of (#1897's double fire) and separated the example from the field
    it demonstrates. The rebuttal lives in entry 4; the README says what to
    write and what the framework then does. The consumer examples use
    `useSidebar()`.
    `ARCHITECTURE.md`'s prefetch lifecycle, `USE_CASE_VERIFICATION.md`'s
    "effect #0", the discussions README's *Data Prefetch* and the upgrade
    README's config shape follow. Mirroring was rejected for the reason
    `CourseHomeMeta`'s own comment gives — a copy drifts — and this contract
    had drifted once already (#2016 edited three docs by hand).

    One `ARCHITECTURE.md` change reads in the diff as a replacement and is
    not. The provider's responsibilities list loses "Prefetch widget data …
    via `widget.prefetch`" and gains "Mount each widget's `Provider` around
    the sidebar children". Those are two independent edits that happen to
    touch the same list: the prefetch bullet goes because the provider no
    longer does that; the `Provider` bullet is added because the provider
    has done that since #1885 (`renderWithWidgetProviders`, used by the
    upgrade widget's `UpgradeWidgetContext` all along) and the doc never
    said so — it should have been there before. This layer gives the
    mechanism a second user, which is what surfaced the omission. The doc
    describes the behaviour, not its history, so it does not say "since
    #1885"; that is recorded here.

14. **Tests.** `DiscussionsProvider.test.tsx` replaces `widgetConfig.test.ts`
    with the same four gates measured as requests on a `MockAdapter`
    (discussion tab → config + topics once; no tab / metadata not loaded / no
    MFE URL → `fetchStatus` `'idle'` and no request), plus *does not load the
    topics again when the course metadata changes* — a `setQueryData` on the
    course-home key after the topics resolved leaves the request count at
    two — the #1897 problem, pinned. `SidebarContext.test.tsx` covers the
    hook's throw. `SidebarContextProvider.test.jsx` drops the
    `QueryClientProvider` wrapper that #2016 added for the prefetch effect's
    `useQueryClient()`, now gone. The provider still calls one query hook,
    `useCourseHomeMeta(courseId, { enabled: false })`, but that suite has
    mocked the module since #2085, its mocked widgets define no `Provider`,
    and the one `Provider` it does supply is a plain function — so nothing
    rendered touches a query client. Un-mocking `useCourseHomeMeta` there
    would bring the wrapper back. The
    three provider-less suites are entry 3's. Negative type check: removing
    `unit` from the provider's context literal fails `npm run types` with
    "not assignable to parameter of type 'SidebarWidgetContext'".

    **Codecov after submit.** The patch check flagged one line: the
    `return true` for a widget with no `isAvailable` — pre-existing and
    uncovered on `master` too, but the `.jsx → .tsx` rename makes the whole
    file patch lines (the #2020 / #2081 effect). Covered with *treats a
    widget without `isAvailable` as always available* in
    `SidebarContextProvider.test.jsx`, which tests the branch's behaviour
    rather than just hitting the line. The same run showed one partial
    branch, the `children = null` default parameter that no caller ever
    exercises (`Course` always passes children); the default was dropped —
    `children?: ReactNode` already makes the prop optional, and an omitted
    child renders nothing whether `undefined` or `null` — so the file is
    100% lines and branches under its own suite.

15. **The three suites supply `SidebarContext.Provider` with test data for
    `value`, not the real `SidebarProvider` — for now.** Settled in review
    after the code landed. The repo's convention for its other typed contexts
    is to mount the real provider component in tests: `ToastProvider`,
    `PluginOverridesProvider`, `CoursewareSearchProvider` and `TourProvider`
    are never faked, and `setupTest`'s `render` wraps every test in the two
    app-root ones. `SidebarContext` is the odd one out — some twenty suites
    render the raw `SidebarContext.Provider` with a hand-rolled partial
    value (`mockData`, `defaultContextValue`, `buildContext(overrides)`),
    a convention from #1885/#1899 that predates this layer. It exists for a
    structural reason: `SidebarProvider` is not an app-root provider;
    `Course.jsx` mounts it with `courseId` and `unitId`, and it derives its
    value from the widget registry, the model store, the course-home query,
    localStorage and the viewport, and wraps its children in every enabled
    widget's `Provider` (`UpgradeWidgetProvider`, and from this layer
    `DiscussionsProvider`, which observes the topics query when the metadata
    has a discussion tab). A test of `LockPaywall` wants "the sidebar is
    closed", not all of that.

    Three shapes were weighed for the three suites this layer made
    provider-dependent. *A shared fixture* (`src/tests/sidebarContextValue.ts`,
    one complete `SidebarContextValue`, spread with overrides) was rejected
    as a third pattern that institutionalises the fake. *The real
    `SidebarProvider`* is the repo's pattern and is feasible here — the two
    navigation suites already render under a router with the course hooks
    mounted, `LockPaywall` would gain `wrapWithRouter: true` and a `unitId`,
    and "nothing open" becomes the provider's own answer for a jsdom viewport
    with empty storage — at the cost of `DiscussionsProvider` requesting the
    two discussion endpoints against an adapter that 404s them wherever the
    metadata fixture has a discussion tab (as `Course.test.jsx` already
    does), and of leaving the other suites on the fake unless they move too.
    *Hand-rolled value, matching the siblings* (chosen, for now): each suite
    passes the two fields its consumer reads. The move to the real provider
    is a sweep across the sidebar suites, not this layer's. Where the
    component under test is one the provider itself mounts
    (`DiscussionsProvider.test.tsx`, `UpgradeWidgetContext.test.jsx`) the raw
    context with a value stays legitimate regardless — wrapping those in the
    provider would be circular.

    **Follow-up layer — filed as #2112 (2026-09-24):** a wide layer that
    (a) moves every remaining `useContext(SidebarContext)` consumer —
    `LockPaywall`, `SidebarBase`, `Sidebar`, `SidebarTriggers`,
    `sequence-navigation/hooks.js`, `course-outline/hooks.js`, the discussions
    and upgrade widget components — onto `useSidebar()`, and (b)
    stops exporting `SidebarContext` itself, so the hook is the only read.
    The two are coupled with the test convention: once the context is not
    exported, the twenty-odd suites that render `SidebarContext.Provider`
    with a hand-rolled `value` have to render the real `SidebarProvider`
    instead — which is the repo's pattern for its other contexts and the
    sweep this entry deferred. The two suites that test components the
    provider itself mounts (`DiscussionsProvider`, `UpgradeWidgetContext`)
    need a way to supply the context without the provider; a test-only
    export or a small test helper is that layer's call.

16. **`refactor!:` with a `BREAKING CHANGE:` footer.** Under `SidebarProvider`
    nothing a learner or an operator's widget observes changes: one topics
    request per sidebar mount, trigger and panel where they were. Outside it,
    `useContext(SidebarContext)` returns `null` and `useSidebar()`
    throws — unreachable in the app. The `prefetch` field of a
    `SIDEBAR_WIDGETS` entry is removed; a widget that used it loads its data
    in a `Provider` with `useQuery` and `enabled`, as the sidebar README now
    shows.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — clean up `SidebarContextProvider` for React Query and convert it to TypeScript (#2111)

In-browser verification against a live backend (tutor dev).

What changed: the courseware sidebar's discussions widget loads its topics
through a `Provider` that observes the topics query with `enabled`, instead of
the provider's `prefetch` effect; the effect, the `courseMetaRef` workaround
and the `prefetch` widget-config field are gone. `SidebarContext` has no
default value. The provider, the context, both built-in widget configs and the
upgrade widget's context module are TypeScript. The topics still land in the
model store for the three `useModel` readers (#2087 converts them).

**The three bugs this layer could introduce.** (1) The topics request fires
more than once per sidebar mount, or fires again on a metadata write — the
observer's `enabled` gate or its dependency on nothing but the key is wrong.
(2) The topics never load — the gate never passes (wrong `tabs` read, wrong
config key), so the trigger never appears on any unit. (3) A consumer renders
outside the provider — now an error instead of an empty render; in the app
every consumer is under `Course`, so this would only show as a crash on the
courseware page.

## Setup

A course with the **Open edX** discussions provider (Authoring → Pages &
Resources → Discussions) and a verified mode, `DISCUSSIONS_MFE_BASE_URL` set
in the tutor config (it is by default). At least one unit with in-context
discussions on and one with it off (Authoring, the unit sidebar's discussion
toggle). Browser devtools open on the Network tab, filtered to `discussion`.

## Checks

Hard reload each page and wait for the Network tab to go idle before counting.

### Request counts (bug 1)

Learning makes exactly two discussion requests, both from `DiscussionsProvider`:
`GET …/api/discussion/v1/courses/{courseId}` and `GET …/api/discussion/v2/course_topics/{courseId}`.
The Network tab also shows the discussions MFE's own requests once the panel is open, because the
iframe is a frame of the same tab — `…/api/discussion/v1/threads/…`, `…/api/discussion/v2/courses/{courseId}/`,
and more. Count with the panel **closed** (the trigger renders without the iframe), or use the
Initiator column: learning's requests come from the learning bundle, the iframe's from the
discussions MFE.

- [x] **Unit with a topic, hard reload, panel closed:** `v1/courses/{courseId}` **1**, `v2/course_topics/{courseId}` **1**, nothing else under `/api/discussion/`.
- [x] **Navigate to the next unit (in-app, sidebar stays mounted):** no new discussion requests.
- [x] **Navigate to another sequence (in-app):** the sidebar remounts with `Course`; one new pair of discussion requests at most, none if the sequence did not remount the provider. Record what was observed.
- [ ] **A metadata write while on the unit:** on a fresh enrolment in a course with celebrations enabled, click *Next* past the first section's last unit so the first-section celebration modal opens (this writes `courseHomeMeta` with `setQueryData`). No new discussion requests. *Skip if no such course is set up; the `DiscussionsProvider` test pins this case.*

### The topics load and gate the widget (bug 2)

- [x] **Unit with an in-context topic:** the discussions trigger shows in the sidebar strip; clicking it opens the panel with an iframe at `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- [x] **Unit with in-context discussions off (same course):** no discussions trigger; an open discussions panel closes. What opens instead, if anything, is the cascade's call (`useUnitShiftBehavior` / `useSidebarSync`, unchanged here).
- [x] **Stored preference:** with `sidebar.{courseId}` = `"DISCUSSIONS"` in localStorage (open discussions once, reload), the discussions panel auto-opens once the topics resolve.
- [ ] **Upgrade trigger (the other built-in, now typed):** shows on a verified-mode course; the panel opens and closes; the red dot clears on first open.
- [ ] **Legacy-provider course:** only the `v1/courses` request; no trigger on any unit. *If no legacy course exists locally, the `discussionTopicsQuery` legacy case carries it — note that here.*

### A stored panel restores on a narrow viewport (the `master` bug this layer fixes)

- [x] **Narrow viewport (below 1200px), open the discussions panel from its trigger, hard reload:** the panel is open again after the reload. On `master` it is closed (reproduced 2026-09-24).
- [x] **Desktop viewport, same steps:** the panel is open again after the reload, with no flash of the outline first.

### Nothing renders outside the provider (bug 3)

- [x] **Courseware page loads with no console error** naming `useSidebar` or a null destructure, on a unit with a topic and one without, with the paywall (a gated unit as an audit learner) and the sequence navigation visible.

### The breaking change is real

- [x] **An `env.config.jsx` widget still declaring `prefetch`:** register a minimal widget with `prefetch: () => console.log('prefetch')`; nothing logs, the widget's `Sidebar`/`Trigger` behave per its `isAvailable`. *Optional; documents that the field is inert.*

## Results

Run 2026-09-24 on tutor dev, course `course-v1:OpenedX+DemoX+DemoCourse` (Open edX discussions provider). 10 of 13 checks run, all passing; 3 not run. The two narrow-viewport checks were run 2026-09-25, after the fix was added.

**Run**

- **Hard reload, unit with a topic, panel closed:** learning's `v1/courses/{courseId}` once and `v2/course_topics/{courseId}` once; with the panel open the iframe added its own `v1/threads/?…` and `v2/courses/{courseId}/`.
- **Next unit (in-app):** no new discussion requests.
- **Another sequence (in-app):** panel closed — no new `v2/course_topics` request (`v1/courses` not checked); panel open — only the iframe's requests. So the provider did not remount across sequences.
- **Unit with an in-context topic:** trigger shown; panel opened with the discussions iframe.
- **Unit with in-context discussions off (same course):** navigating onto it removed the trigger and closed the open discussions panel; nothing opened in its place.
- **Stored preference:** the discussions panel auto-opened after reload once the topics resolved.
- **Stored panel restores on a narrow viewport (run 2026-09-25):** below 1200px, discussions opened from its trigger, hard reload — the panel was open again. Desktop viewport, same steps — open again, with no flash of the outline first. The bug this fixes was reproduced by hand on `master` 2026-09-24 (panel closed after a narrow-viewport reload).
- **Console:** nothing matched `useSidebar` or `Cannot destructure`. The remaining console noise (`defaultProps` deprecations; a Paragon `Dropdown` `id` prop-type warning from `@edx/frontend-component-header`'s `AuthenticatedUserDropdown`) is unrelated to this layer and present on `master`.
- **`env.config.jsx` widget declaring `prefetch` (the breaking change):** a probe widget with both `prefetch` and `Provider` (each logging): the "Probe" trigger rendered and its panel opened; `[probe] Provider mounted` logged (twice, React `StrictMode`'s development double-invoke — one real mount); `[probe] prefetch called` never logged. The field is inert, as documented.

**Not run**

- **Metadata write while on the unit:** needs a fresh enrolment in a course with celebrations enabled. Covered by `DiscussionsProvider.test.tsx` *does not load the topics again when the course metadata changes*.
- **Upgrade trigger:** needs a course with a paid track (`verifiedMode`). The upgrade widget's runtime is unchanged in this layer (its config, `utils.ts` and `UpgradeWidgetContext.tsx` converted with bodies intact); its four suites pass.
- **Legacy-provider course:** none set up locally. Covered by the `discussionTopicsQuery` legacy case in `apiHooks.test.tsx` and the *no discussion tab* case in `DiscussionsProvider.test.tsx`.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
