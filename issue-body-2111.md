Part of #1946 — Redux → React Query migration (Stage 1). Peeled out of #2087 (layer C of the model-store dissolution, #1977), the way #2091 was peeled out of #2083. C is a wide layer — three `useModel` readers swapped lightly; this is a deep one — few files, every change in them the right one now that React Query is there.

**Goal:** clean up `SidebarContextProvider` for React Query and convert it to TypeScript, giving the sidebar widget contract named types — the widget config object and the context object its `isAvailable` function receives — so #2087 changes the type of one field (`unit`) instead of re-describing the contract in a README comment.

**Why not a plain TypeScript conversion.** Typing the file as it stands means typing around two patterns that exist only because it predates React Query: a context created with a default object, which lets a consumer outside the provider render empty instead of failing; and a `prefetch` effect that reads the merged course metadata through a ref (`courseMetaRef`) so it does not re-fire on metadata updates — PR #1897's fix for duplicate topic requests, approved with "the `ref` workaround solves it, but it's a bit hacky. The real solution is going to be moving to React Query, later on." React Query is here, so the real solution lands in this layer rather than a nullable type for a value the code never leaves null.

**Context.** The courseware sidebar has its own widget registry, separate from `frontend-plugin-framework`: `getEnabledWidgets` (`courseware/course/sidebar/defaultWidgets.js`) merges the built-in widgets (discussions, upgrade) with a `SIDEBAR_WIDGETS` array from the app config. Each widget is a plain object — `id`, `priority`, `Sidebar`, `Trigger`, `Provider?`, `enabled`, and two optional functions, `isAvailable(context)` and `prefetch(context)`. `SidebarContextProvider.jsx` builds the `isAvailable` context once per render (`{ courseId, unitId, course, unit }`, `:50-56`) and is the only caller (`:59`); the `prefetch` effect (`:93-100`) is used by one widget, discussions, to load the topics its trigger's availability depends on. The contract is documented for operators in `sidebar/README.md` as JavaScript object literals with comments, and `SidebarContext.js` carries a JSDoc `@typedef` for the context value.

**Tasks**
- **The discussions prefetch becomes a query observer.** A `DiscussionsProvider` (the contract's existing `Provider` field, mounted inside `SidebarContext` for every enabled widget) calls `useQuery` on the topics query with `enabled: !!DISCUSSIONS_MFE_BASE_URL && hasDiscussionTab(tabs)`; same gate, same post-mount timing, no refetch on metadata writes because an observer fetches on mount and key change, not on re-render. The query definition moves into a `queryOptions` object, `discussionTopicsQuery(courseId)`, exported from `courseware/data/apiHooks.ts` for the tests and for #2087's reader hook; `prefetchDiscussionTopics` and `discussionsPrefetch` go. The bridge `meta` stays on the query until #2087 converts the readers.
- **The `prefetch` field leaves the contract**, and with it the effect, `courseMetaRef`, the second merge and `useQueryClient` in the provider. Breaking (`refactor!` + footer): a widget that used `prefetch` loads its data in a `Provider` with `useQuery` instead.
- **`SidebarContext.js` → `.ts`**: `createContext<SidebarContextValue | null>(null)` plus a throwing `useSidebar()`, the `ToastContext` shape; exports `SidebarWidget`, `SidebarWidgetContext` and `SidebarContextValue`. The default object goes: it served only tests that rendered a consumer without a provider.
- **`SidebarContextProvider.jsx` → `.tsx`**: `propTypes` → a `Props` interface with destructuring defaults (#2065); `enabledWidgets` typed `SidebarWidget[]` so the context literal is checked; refs typed.
- **`course: CourseHomeMeta & CoursewareMeta`**, inline. `CoursewareMeta` is added to `courseware/data/apiHooks.ts` as B2 added `CourseHomeMeta` — an index-signature interface on `useCoursewareMetadata`, fields named as D3's readers convert.
- **`unit: Partial<DiscussionTopic>`**, what `useModel` returns today (a topic or `{}`); `DiscussionTopic` is added beside the query. #2087 changes this line.
- **Both built-in `widgetConfig.js` files → `.ts`** (and the upgrade widget's `utils.js`), typed as `SidebarWidget`, so the contract checks the built-ins' own functions.
- **Docs**: `sidebar/README.md`, `ARCHITECTURE.md`, `USE_CASE_VERIFICATION.md` and `widgets/discussions/README.md` describe the Provider observer instead of `prefetch`, and the contract blocks point at the named types.

**Not in scope:** the three `useModel('discussionTopics')` reads and the `unit` data source (#2087); the `coursewareMeta` read (#2089); `Sidebar.jsx`, `SidebarTriggers.jsx`, `defaultWidgets.js` and the `hooks/*.js` files; rewriting `useContext(SidebarContext)` call sites in files not otherwise touched.

**Verify:** one `course_topics` request per sidebar mount and none on a metadata write (the #1897 case, pinned by a `DiscussionsProvider` test); trigger and panel unchanged for units with and without a topic; the suites that rendered a consumer bare (`LockPaywall`, `SequenceNavigation`, `UnitNavigation`, five renders in `Sequence.test.jsx`) get a provider; `npm run types`, `npm run lint` and the full suite green.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **What React Query did and did not change about #1897's problem.** The effect fired twice because the two metadata models settled in separate batches and the thunk fetched unconditionally. Under B3 (#2086) the provider renders after the gate, so both are present at first render; and `queryClient.query` dedupes an in-flight request. But at `staleTime: 0` a fire after settlement still refetches, and the merge does change after first render — the celebration writers now `setQueryData` on `courseHomeMeta`. So simply dropping the ref would trade duplicate requests on load for a new request on every metadata write. The observer is the fix because an `enabled` query does not refetch on re-render; the effect's dependency list was never the right tool.
- **The `unit` argument is why this is peeled.** #2087 converts the provider's `useModel('discussionTopics', unitId)` read to a query hook whose `select` returns the unit's topic or `undefined`; `useModel` returned `{}`. Inside the repo every read is an optional chain; `unit` is also handed to operator-supplied `isAvailable` functions, and the README types it only as `unit: object`. As a declared type, `unit?: …`, the decision is visible in a widget author's editor and enforced against the built-in widgets' typed configs.
- **The two metadata payloads are not a superset relation.** `course_metadata` has `tabs`, `org`, `isStaff`, `verifiedMode`, `courseAccess`, …; the courseware endpoint has `enrollmentMode`, `accessExpiration`, `userNeedsIntegritySignature`, `entranceExamData`, and about thirty more; six fields overlap. The README's `course` comment names `enrollmentMode`, so widget authors were told to expect the merge, and the type says so inline rather than through a sidebar-local alias.
- **The contract has already changed once without a type** (#2016, `dispatch → queryClient`, three docs edited by hand) and changes again here. A named type makes the next change a diff on one declaration.
- **`getConfig()` has no `SIDEBAR_WIDGETS` or `DISCUSSIONS_MFE_BASE_URL` key in frontend-platform's `ConfigDocument`.** `progress-tab/utils.ts` reads a custom key today and passes `npm run types`, so the `DISCUSSIONS_MFE_BASE_URL` read in `DiscussionsProvider.tsx` is expected to compile the same way; `defaultWidgets.js`'s `SIDEBAR_WIDGETS` read stays in JavaScript.


> [!NOTE]
> The plan below was generated by Claude (Claude Code) and reviewed before posting.

<details>
<summary>Claude Plan — SidebarContextProvider React Query cleanup + TypeScript conversion</summary>

# Plan — Clean up `SidebarContextProvider` for React Query and convert it to TypeScript

Layer in the running stack on top of B3 (#2086, PR #2110), peeled out of C
(#2087). C is a **wide** layer: three `useModel` readers swapped lightly. This
is a **deep** one: few files, and every change in them is the right one now
that React Query is there. A plain `.jsx → .tsx` pass was the first draft and
was rejected in review, because it would have typed around two patterns that
exist only because the file predates React Query — a null-default context
that hides a missing provider, and an effect + ref that hand-rolls a
deduplicated prefetch. Both go here; the types then describe the file as it
should be, not as it was.

Scope is the issue body above;
it has no comments.

## Context

### How it works today

**The widget contract is three untyped object shapes.** The sidebar's widget
registry (`courseware/course/sidebar/defaultWidgets.js`) merges the two
built-in widgets, discussions and upgrade, with a `SIDEBAR_WIDGETS` array from
the app config. A widget is a plain object — `id`, `priority`, `Sidebar`,
`Trigger`, `Provider?`, `enabled`, `isAvailable?`, `prefetch?`.
`SidebarContextProvider.jsx` is the only caller of the two functions. It
builds one context object per render for `isAvailable`:

```js
// SidebarContextProvider.jsx:50-63
const getAvailableWidgets = useCallback(() => {
  const context = {
    courseId,
    unitId,
    course: { ...coursewareMeta, ...courseHomeMeta },
    unit,
  };
  return enabledWidgets.filter(widget => {
    if (widget.isAvailable) {
      return widget.isAvailable(context);
    }
    return true; // If no isAvailable function, widget is always available
  });
}, [enabledWidgets, courseId, unitId, coursewareMeta, courseHomeMeta, unit]);
```

and a second one for `prefetch`, from an effect, through a ref:

```js
// SidebarContextProvider.jsx:90-100
const courseMetaRef = useRef(null);
courseMetaRef.current = { ...coursewareMeta, ...courseHomeMeta };

useEffect(() => {
  enabledWidgets.forEach(widget => {
    if (widget.prefetch) {
      widget.prefetch({ courseId, course: courseMetaRef.current, queryClient });
    }
  });
}, [enabledWidgets, courseId, queryClient]);
```

The only `prefetch` is the discussions widget's (`widgets/discussions/widgetConfig.js:9-13`):
gate on `DISCUSSIONS_MFE_BASE_URL` and a `discussion` tab, then
`prefetchDiscussionTopics(queryClient, courseId)`, which is
`queryClient.query({ queryKey, queryFn, meta }).catch(noop)` in
`courseware/data/apiHooks.ts:120-137`. The topics land in the model store
through the bridge `meta`, and three `useModel('discussionTopics', unitId)`
readers (the trigger, the panel, and the provider's `unit`) read them there.

**Why the ref is there — PR #1897.** The first version of that PR had the
effect depend on `coursewareMeta` and `courseHomeMeta`. `arbrandes` requested
changes: the two models settled in separate React batches on initial load, so
the effect fired twice once the gate passed, and the thunk it called fetched
unconditionally — two identical requests to each discussion endpoint per page
load. He suggested dropping the models from the dependency array and reading
the latest value "via a ref or by passing the models lazily"; the "addressed
feedback" commit added `courseMetaRef`. His approval: "the `ref` workaround
solves it, but it's a bit hacky. The real solution is going to be moving to
React Query, later on." `ARCHITECTURE.md:166-181` records the reasoning.

**What React Query has and hasn't changed since.** Two of the three parts of
that problem are gone: under B3 the provider renders after the gate, when both
metadata sources are present at first render, so the two-batch double fire
cannot happen; and `queryClient.query` dedupes an in-flight request. The third
is not: at `staleTime: 0` any effect fire after settlement refetches, and the
merge *does* change after first render — the celebration writers B3 moved
onto `setQueryData` give `courseHomeMeta` a new reference. So depending on the
merge directly would trade the old duplicate requests on load for a new
topics request on every metadata write. Removing the ref means replacing the
effect, not just its dependency list.

**The context has a default object.** `SidebarContext.js` passes an object to
`createContext`, so `useContext(SidebarContext)` outside `SidebarProvider`
returns `{ currentSidebar: null, …, availableSidebarIds: [] }` and the
consumer renders empty with no error. Every consumer in the app is under the
provider (`Course.jsx:76`); the default is read only by tests that rendered a
consumer bare — `LockPaywall.test.jsx`, `SequenceNavigation.test.jsx`,
`UnitNavigation.test.jsx`, and five bare renders in `Sequence.test.jsx` — and
it is what let them pass without anyone noticing.

**The contract is documented in prose, three times.** `sidebar/README.md`
restates the widget object (*Widget Structure*, `:15-29`), the `isAvailable`
argument (*Context Object*, `:71-84`, with `unit: object`) and the `prefetch`
argument (*The `prefetch` field*, `:51-66`). #2016 changed the prefetch
argument and edited three docs by hand. `SidebarContext.js:3-16` carries a
JSDoc typedef for the context value.

**Precedents.** Typed contexts: `generic/ToastContext.tsx` and three siblings
— value interface in the context module, `createContext<T | null>(null)`, a
`useX()` hook that throws outside the provider. Component props: a `Props`
interface with destructuring defaults (`UnitButton.tsx`, #2065;
PR #2092's decision log, entry 3). Metadata types: `CourseHomeMeta` names only the
fields TypeScript readers need, index signature for the rest
(PR #2109's decision log, entry 3).

### What the two metadata payloads are

Not a superset relation; two endpoints with a modest overlap:

| | fields |
|---|---|
| both | `id`, `title`, `start`, `celebrations`, `isEnrolled`, `userTimezone` |
| `course_metadata` (course-home) only | `tabs`, `org`, `number`, `isStaff`, `originalUserIsStaff`, `verifiedMode`, `courseAccess`, `canViewCertificate`, `username`, `isSelfPaced`, `isMasquerading` |
| `courseware/course/{id}` only | `enrollmentMode`, `accessExpiration`, `contentTypeGatingEnabled`, `marketingUrl`, `userNeedsIntegritySignature`, `entranceExamData`, `offer`, `courseGoals`, `certificateData`, `verificationStatus`, `end`, `enrollmentStart`, `enrollmentEnd`, `bannerText`, … (`normalizeMetadata`, `courseware/data/utils.js`) |

The README's `course` comment names `enrollmentMode`, a courseware-only field,
so widget authors were told to expect the merge.

## The change

### 1. The discussions prefetch becomes a query observer in a widget `Provider`

The effect exists so the topics load before the trigger can decide whether to
render; the trigger's availability depends on the data. React Query's way to
say "load this while these conditions hold" is an observer with `enabled`, and
the widget contract already has the place to mount one: the `Provider` field,
which `renderWithWidgetProviders` (`SidebarContextProvider.jsx:178-183`) wraps
around the sidebar children for every enabled widget, inside `SidebarContext`.
The upgrade widget uses it for its own state; the discussions widget gets one
for its data:

```tsx
// widgets/discussions/DiscussionsProvider.tsx
const DiscussionsProvider = ({ children }: { children: ReactNode }) => {
  const { courseId } = useSidebar();
  const tabs = useCourseHomeMeta(courseId, { enabled: false }).data?.tabs;
  useQuery({
    ...discussionTopicsQuery(courseId),
    enabled: !!getConfig().DISCUSSIONS_MFE_BASE_URL && hasDiscussionTab(tabs),
  });
  return children;
};
```

Same gate as `discussionsPrefetch`, same post-mount timing (an observer's
first fetch happens after mount, as the effect's did), one request per
Provider mount. It does not refetch when the metadata changes: an observer
fetches on mount and on key change, not because its component re-rendered or
because `enabled` stayed true —

> If the query has cached data, then the query will be initialized in the
> `status === 'success'` or `isSuccess` state. If the query does not have
> cached data, then the query will start in the `status === 'pending'` and
> `fetchStatus === 'idle'` state. The query will not automatically fetch on
> mount.
> — [Disabling/Pausing Queries › When `enabled` is `false`](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries)

> The enabled option can not only be used to permanently disable a query, but
> also to enable / disable it at a later time.
> — same page, *Lazy Queries*

— so the case `courseMetaRef` protected against is handled by the model. The
`meta` bridge entry moves onto the query definition unchanged, so the three
`useModel` readers keep working until C converts them; the `tabs` read is the
non-fetching shape B3 uses for `courseHomeMeta` under the courseware page.

The query definition is shared with C's future reader hook through the
`queryOptions` helper, exported from `courseware/data/apiHooks.ts`:

```ts
export const discussionTopicsQuery = (courseId: string) => queryOptions({
  queryKey: coursewareQueryKeys.discussionTopics(courseId),
  queryFn: async () => { /* verbatim from prefetchDiscussionTopics */ },
  meta: { models: [{ modelType: 'discussionTopics', strategy: 'updateModels', idField: 'usageKey' }] },
});
```

> One of the best ways to share `queryKey` and `queryFn` between multiple
> places, yet keep them co-located to one another, is to use the `queryOptions`
> helper.
> — [Query Options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)

`prefetchDiscussionTopics` and `discussionsPrefetch` go; `discussionsWidgetConfig`
gains `Provider: DiscussionsProvider` and loses `prefetch`.

### 2. The `prefetch` field leaves the contract

With the discussions widget on a Provider, `prefetch` has no user, and keeping
it means keeping the effect and the ref for a hypothetical external widget —
the pattern being removed. `Provider` covers the same need declaratively.
Removing it is a breaking change to a documented operator contract, the third
time this field changes (`dispatch → queryClient` in #2016, now gone), so the
commit is `refactor!` with a footer naming the removed field and its
replacement. The provider loses the effect, `courseMetaRef`, the second merge
and the `useQueryClient` import; `course` is built once, in
`getAvailableWidgets`, as in #1885. Open question 6 records "keep it" as the
alternative.

### 3. `SidebarContext.js` → `SidebarContext.ts`: the types, and no default

It already holds the JSDoc typedef, every README example imports from this
path, and the `ToastContext` shape puts the value type beside the context. It
exports:

```ts
import type { ComponentType, ReactNode } from 'react';
import type { CourseHomeMeta } from '@src/course-home/data/apiHooks';
import type { CoursewareMeta, DiscussionTopic } from '@src/courseware/data/apiHooks';

// What isAvailable receives: one object per render, shared by every widget.
export interface SidebarWidgetContext {
  courseId: string;
  unitId: string;
  course: CourseHomeMeta & CoursewareMeta;   // §5
  unit: Partial<DiscussionTopic>;            // §6 — C (#2087) changes this line
}

export interface SidebarWidget {
  id: string;
  priority?: number;                          // default WIDGET_PRIORITIES.DEFAULT
  Sidebar: ComponentType;
  Trigger: ComponentType<{ onClick: () => void }>;
  Provider?: ComponentType<{ children: ReactNode }>;
  isAvailable?: (context: SidebarWidgetContext) => boolean;
  enabled?: boolean;                          // external widgets: enabled unless false
}

export interface SidebarContextValue { … }   // the typedef, field for field

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const useSidebar = (): SidebarContextValue => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
export default SidebarContext;
```

Field comments carry what the README blocks say today (§8). `priority` and
`enabled` are optional because `getEnabledWidgets` treats them so for external
widgets (`defaultWidgets.js:30-38`). The value type is the typedef made real,
with `SIDEBARS` as a record of `{ ID, Sidebar, Trigger, isAvailable? }` (what
`buildSidebarsRegistry` builds) and `availableSidebarIds: string[]`.

**The default object goes** (settled in review, open question 1). A component
outside the provider now gets `null` from `useContext(SidebarContext)` and a
readable error from `useSidebar()` — the loud failure a context should
give. `SidebarContext` stays exported: the built-in widgets, `LockPaywall`,
`SidebarBase` and the two hooks files call `useContext(SidebarContext)` and
convert to the hook as their files do; `SidebarContext.Provider` is how tests
supply a value. `DiscussionsProvider` is the hook's first user.

### 4. `SidebarContextProvider.jsx` → `.tsx`

- `propTypes` + `defaultProps` → `interface Props { courseId: string; unitId:
  string; children?: ReactNode }`, `children = null` in the destructure.
- `enabledWidgets` is `useMemo<SidebarWidget[]>(…)`: `getEnabledWidgets` is
  JavaScript and returns `any`; this annotation is what makes the compiler
  check the `isAvailable` context literal and the `Provider` render against
  the declared types.
- `previousUnitIdRef` / `courseOutlineSetByUnitRef` → `useRef<string | null>(null)`;
  the two boolean refs infer.
- `contextValue` is `useMemo<SidebarContextValue>(…)`; the provider value is
  now the non-null type.
- Gone: the prefetch effect, `courseMetaRef` and its merge, `useQueryClient`,
  `useEffect` from the import (§2).
- Stays: `useModel('coursewareMeta', courseId)` and `useModel('discussionTopics',
  unitId)` (D3 and C convert them), the JavaScript hooks and registry imports.

### 5. `CoursewareMeta`, and `course: CourseHomeMeta & CoursewareMeta`

The merge is typed inline as what it is (settled in review, open question 2).
`CourseHomeMeta` exists (B2). `CoursewareMeta` is added to
`courseware/data/apiHooks.ts` the way B2 added its counterpart:

```ts
// Names only the fields this repo's TypeScript readers need; the endpoint returns many more,
// left reachable as `unknown`. D3 (#2089) names fields as its readers convert.
export interface CoursewareMeta {
  [key: string]: unknown;
}

export const useCoursewareMetadata = (…) => useQuery<CoursewareMeta>({ … });
```

It starts as the index signature alone because no TypeScript reader of the
courseware payload exists yet. `getCourseMetadata` returns `any`, so the
annotation is accepted, and no caller reads `.data` today (`CoursewareContainer`
and `useIsCourseLoaded` read status). Two `unknown` index signatures intersect
cleanly.

Spreading an `any` (`coursewareMeta` from `useModel`) makes the literal `any`,
so the compiler accepts the declaration rather than deriving it; the
declaration is the statement. Not `Partial`: the provider renders under the
gate (`LoadedTabPage` throws unless the metadata query is in success), so
`courseHomeMeta` is defined at every render in the app — the fact B3 relied
on. Both built-in widgets read fields `CourseHomeMeta` names: `verifiedMode`
(`upgradeIsAvailable`), `tabs` (`DiscussionsProvider`). Rejected: a
sidebar-local alias (`SidebarCourse`) — a second name for the same thing.

### 6. `DiscussionTopic`, and `unit: Partial<DiscussionTopic>`

In `courseware/data/apiHooks.ts`, replacing the inline `{ usageKey: string |
null }[]` annotation in the `queryFn`:

```ts
// Names the fields this repo reads; the endpoint returns more (name, thread counts, …).
export interface DiscussionTopic {
  id: string;
  usageKey: string | null;
  enabledInContext: boolean;
  [key: string]: unknown;
}
```

`useModel('discussionTopics', unitId)` returns the topic or `{}`; `{}` and a
full topic are both `Partial<DiscussionTopic>`, and `unit?.id &&
unit?.enabledInContext` type-checks against it. This is the line C changes —
to `unit?: DiscussionTopic` if its hook returns `undefined` for a unit with
no topic — and where that decision is visible to a widget author's editor.

### 7. The built-in widget configs convert

`widgets/discussions/widgetConfig.js` changes anyway (`prefetch` out,
`Provider` in), so it becomes `widgetConfig.ts` with
`export const discussionsWidgetConfig: SidebarWidget = { … }` and
`discussionsIsAvailable = ({ unit }: SidebarWidgetContext) => …`. That is
what makes the contract check a built-in widget's own function, not only the
argument the provider hands it. `widgets/upgrade/src/widgetConfig.js` and
`utils.js` (`upgradeIsAvailable`) convert the same way (settled, open
question 5): `upgradeWidgetConfig: SidebarWidget` and
`upgradeIsAvailable = ({ course }: SidebarWidgetContext) => !!course?.verifiedMode`.
Both built-ins then exercise the contract the way an author's widget would,
and the README's "see `src/widgets/upgrade/` for a real example" points at a
typed one. `utils.test.js` calls `upgradeIsAvailable({})` and with `course:
null`; those cases are JavaScript and keep running as written.

### 8. Docs

- `sidebar/README.md`: *Widget Structure* and *Context Object* become the
  import lines for `SidebarWidget` / `SidebarWidgetContext` and one annotated
  example config, field comments moving onto the declarations (settled, open
  question 4);
  *The `prefetch` field* becomes *Loading widget data*, showing the
  `DiscussionsProvider` shape — a `Provider` that observes a query with
  `enabled` — and stating the timing the old section stated (post-mount, the
  sync logic re-evaluates availability); *The `Provider` field*'s "no
  built-in widgets use this field" becomes "the discussions widget does";
  consumer examples use `useSidebar()`; *Accessing Course Data* is
  unchanged (C rewrites its last line).
- `sidebar/ARCHITECTURE.md:155-190`: *Widget Prefetch Lifecycle* and the
  provider's "Prefetch widget data" responsibility are rewritten for the
  Provider observer; the `courseMetaRef` paragraph goes.
- `sidebar/USE_CASE_VERIFICATION.md:153` ("Calls widget.prefetch()") updated.
- `widgets/discussions/README.md`: *Data Prefetch* → the Provider; the
  *Exports* row for `discussionsPrefetch` → `DiscussionsProvider`; the bridge
  parenthetical stays until C.
- `widgets/upgrade/README.md:88` (`isAvailable` comment) can name the type.

Wording is for code review.

## Tests

- **Suites that rendered a consumer without a provider** get a
  `SidebarContext.Provider` with the fields their consumer reads, the
  partial-`value` shape the widget suites use: `LockPaywall.test.jsx`
  (`currentSidebar`, `availableSidebarIds`), `SequenceNavigation.test.jsx` and
  `UnitNavigation.test.jsx` (reach `useIsSidebarOpen` in
  `sequence-navigation/hooks.js:100-103`), and `Sequence.test.jsx`'s five bare
  renders (`:72`, `:105`, `:140`, `:172`, `:482`) move under its
  `SidebarWrapper`. Confirmed by running the suite with the default removed
  before any provider is added: every failure is on this list, or it is a
  consumer the count missed.
- **`useSidebar` throws outside a provider** — one case, the `useToast`
  precedent.
- **`widgets/discussions/widgetConfig.test.ts`** (four `discussionsPrefetch`
  cases) becomes **`DiscussionsProvider.test.tsx`** with the same gates,
  measured as requests on a `MockAdapter`: no configured URL → no request; no
  `discussion` tab → no request; both → one request to the config URL (and,
  with an `openedx` provider, one to the topics URL); *a metadata write does
  not refetch* — `setQueryData` on the course-home key after the topics
  resolved, assert the topics request count is still one. That last case is
  the #1897 problem, pinned. Renders under a `SidebarContext.Provider` with
  `courseId` and a `QueryClientProvider` whose client is seeded with course
  metadata (`seedQueryData`, the `EnrollmentAlert.test.tsx` shape).
- **`courseware/data/apiHooks.test.tsx`**, the `prefetchDiscussionTopics`
  describe: its three cases call
  `queryClient.query(discussionTopicsQuery(courseId))` on the bridged client
  instead, assertions unchanged (they read the model store, which the `meta`
  still fills).
- **Seeding suites** (`DiscussionsSidebar.test.jsx:46`, `DiscussionsTrigger.test.jsx:48`,
  `courseware/course/test-utils.jsx:31`): the one-line seed becomes
  `queryClient.query(discussionTopicsQuery(courseId))` on the same bridged
  client. Readers still read the store in this layer, so nothing else moves;
  C re-plumbs them onto the render's client.
- **`Course.test.jsx`** *sidebar behavior*: the real `DiscussionsProvider`
  now mounts under `Course` and observes the topics query on the render's
  client, against `initializeTestStore`'s adapter, which has no discussion
  handlers — as the prefetch effect did today (the seed's adapter is
  `restore()`d before render). Same 404-and-log as today; the store keeps the
  seed. Expected unchanged.
- **`SidebarContextProvider.test.jsx`**: expected unchanged — mocked widgets
  without `Provider` or `prefetch`; the `QueryClientProvider` wrapper from
  #2016 becomes unnecessary and is removed with the `useQueryClient` call it
  served. Verify rather than assume.
- **Negative type checks**: remove `unit` from the context literal → `npm run
  types` fails; drop `Provider` from `discussionsWidgetConfig` → nothing fails
  at type level (optional field), which is why the request-count cases exist.

## Behaviour changes

- **Under `SidebarProvider`, for a learner: none.** The topics request fires
  once per sidebar mount, as before; trigger and panel appear where they did.
  What stops happening is a class of request that the ref was preventing and
  the observer prevents by design; nothing new starts.
- **Outside the provider, a consumer fails instead of rendering empty.**
  Unreachable in the app.
- **Operators**: the `prefetch` widget-config field is removed. A widget that
  used it loads its data in a `Provider` component with `useQuery` instead;
  the README shows the discussions widget doing exactly that. `useContext(SidebarContext)`
  outside the sidebar returns `null`.

## Commit type

`refactor!:` with a `BREAKING CHANGE:` footer: what was removed (the
`prefetch` field of a `SIDEBAR_WIDGETS` entry; the context default), what to
do instead (a `Provider` that observes a query with `enabled`;
`useSidebar()` under `SidebarProvider`), and where the README is. One
commit: the observer, the effect's removal and the types are one change.

## Not in scope

- The `unit` data source and the three `useModel('discussionTopics')` reads
  (C, #2087); the `coursewareMeta` read (D3, #2089).
- Rewriting existing `useContext(SidebarContext)` call sites in files this
  layer does not otherwise touch.
- Converting `defaultWidgets.js` and how `SIDEBAR_WIDGETS` is read off
  `getConfig()` (frontend-platform's `ConfigDocument` has neither the key nor
  an index signature; `progress-tab/utils.ts:5` reads a custom key today, so
  `getConfig().DISCUSSIONS_MFE_BASE_URL` in `DiscussionsProvider.tsx` is
  expected to compile the same way — confirmed at `npm run types`).

## Open questions

1. **Context default — settled (2026-09-24): `null` plus a throwing
   `useSidebar()`** (§3). The first draft kept the default object as
   the smaller change; rejected because it only ever served tests that
   rendered a consumer bare and hides the exact mistake a context should
   report.
2. **`course` — settled (2026-09-24): `CourseHomeMeta & CoursewareMeta`
   inline, `CoursewareMeta` added** (§5). The first draft declared
   `CourseHomeMeta` alone; review asked whether the course-home payload is a
   superset of the courseware one — it is not — so that was half a type under
   the wrong endpoint's name. An alias was offered and rejected as a second
   name.
3. **The prefetch ref — settled (2026-09-24): removed, with the effect,
   by the Provider observer** (§1–2). Three drafts: type the hand-off nullable
   and leave the structure; a `useMemo` merge with the ref initialised from
   it; leave it for C. Review: `arbrandes` named React Query as the real fix
   in #1897 and it is here now; and a deep layer does not type around a
   pattern it should remove. The mechanism that makes the observer correct
   where the bare dependency was not is in *How it works today*.
4. **README — settled (2026-09-24): link to the declarations, don't mirror
   them.** Each contract block becomes the import line (TypeScript, and the
   JSDoc `@type` form for JavaScript configs) plus one short example widget
   config annotated with the type, so a reader on GitHub sees the shape once
   in context without a copy of every interface. Field comments live on the
   declarations; README prose stays only for what a type cannot say
   (priority spacing, a Provider query's post-mount timing). Rejected:
   mirroring, for the reason `CourseHomeMeta`'s comment gives — a copy
   drifts — and this contract has drifted once already.
5. **Upgrade widget files — settled (2026-09-24): convert `widgetConfig.js`
   and `utils.js` to TypeScript too** (§7). Related enough to the contract
   being typed; both built-ins then exercise it the way an author's widget
   would, and the README's "real example" points at a typed one.
6. **`prefetch` — settled (2026-09-24): removed from the contract** (§2).
   Why it existed: before #1897 `DiscussionsTrigger` fetched its own topics,
   but the framework mounts a trigger only when its widget is available and
   the discussions widget's availability depends on the topics — so the
   fetch moved to framework level, run for every enabled widget regardless of
   availability. In a Redux world "load data" was "dispatch a thunk", a plain
   function call, so it became a callback given `dispatch` (later
   `queryClient`) and `course`; the `Provider` field #1885 had added days
   earlier was framed as panel↔trigger shared state, not data. With React
   Query, loading is a hook and needs a component; the framework already
   mounts one per enabled widget, inside `SidebarContext`, regardless of
   availability — `Provider`. Same idea, React Query's shape, no ref. Keeping
   `prefetch` would keep two ways to do one thing, the older needing the ref.
   Outward-facing: named in the `BREAKING CHANGE` footer with the replacement.

## Verification

- `nvm use && npm run types`, `npm run lint`, full suite (output to a file).
- Negative checks under *Tests*.
- Manual (tutor dev), the #2098 protocol: hard reload a unit, wait for idle,
  count `v1/courses/{courseId}` and `v2/course_topics/{courseId}`: **1** each.
  Then trigger a metadata write — click *Next* past the first section of a
  fresh enrolment with celebrations on — and confirm the counts stay at 1.
  Trigger and panel appear on a unit with an enabled topic; hidden on one
  without; the stored-preference auto-open still happens once the topics
  resolve. Unit navigation within the sidebar's lifetime: no new topics
  request.

## Stack

One layer on top of B3 (#2086, PR #2110), added with
`gh stack add`; closes #2111.
C (#2087) moves up one layer; its plan
is re-sequenced: the `queryOptions` definition and the `DiscussionTopic` type
exist, its README task shrinks to the *Accessing Course Data* line, and its
open question 1 becomes the declared type of `unit`.

</details>

