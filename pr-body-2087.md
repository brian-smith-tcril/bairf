## Summary

The three readers of the `discussionTopics` model — the discussions widget's trigger and panel, and the sidebar provider's `unit` — read the current unit's topic through a new hook, `useDiscussionTopic(courseId, unitId)` in `courseware/data/apiHooks.ts`, and the query drops its bridge entry, so nothing writes that model any more. The hook spreads `discussionTopicsQuery(courseId)` with `enabled: false` and a `select` that finds the unit's topic by `usageKey`: it never fetches, because the fetch is `DiscussionsProvider`'s by design (#2113), and a disabled observer subscribes to the same cache entry, so the readers re-render when that fetch lands — which is how the sidebar opens the discussions panel once the topics arrive. `SidebarWidgetContext.unit` becomes `unit?: DiscussionTopic`, the value the hook returns, in place of the `Partial<DiscussionTopic>` that described `useModel`'s `{}`. **No learner-visible change and no request-count change**: one topics request per sidebar mount, the Provider's. **Breaking for operators**: `useModel('discussionTopics', unitId)` returns `{}` and `unit` is `undefined` where it was `{}` — see *Operators — breaking*. Part of the Redux → React Query migration (#1946, Stage 1); layer C of the model-store dissolution (#1977), the only `discussionTopics` layer, built on the three layers below it (#2120, #2113, #2116). Closes #2087.

## What changed

- **`useDiscussionTopic(courseId, unitId)`**, beside the query in `courseware/data/apiHooks.ts`: `useQuery({ ...discussionTopicsQuery(courseId), enabled: false, select: topics => topics.find(topic => topic.usageKey === unitId) })`. `enabled: false` is hard-coded, not an option, per the `useIsCourseLoaded` reasoning in #2098: a caller with no Provider above it stays `pending`, which fails loudly. `find` returns an element of the cached array, so the provider's `useCallback` dependency on `unit` stays stable across renders; the `select` is inlined because it is one `find` over a short list (decision 2).
- **The three readers** — `widgets/discussions/DiscussionsSidebar.jsx`, `DiscussionsTrigger.jsx` (its `useSidebar()` destructure gains `courseId`) and `courseware/course/sidebar/SidebarContext.tsx` — take `useDiscussionTopic(courseId, unitId).data` in place of `useModel('discussionTopics', unitId)`. `SidebarContext.tsx` keeps `useModel` for `coursewareMeta` (D3, #2089).
- **`unit?: DiscussionTopic`** on `SidebarWidgetContext`, no sentinel and no comment (decision 1).
- **The bridge entry goes.** `discussionTopicsQuery` drops its `meta`; the bridge's `idField` pass-through then has no user and is left for the teardown (#1977) with its test (decision 9).
- **Docs.** The sidebar README's *Accessing Course Data* names the hook in place of its `useModel` holdover line, so `useModel` appears nowhere in that file; the discussions widget README drops its "bridged into the `discussionTopics` model" sentence and names the hook.
- **Tests.** The readers now read the client the component renders under, not the store the seed's bridged client filled (decisions 3–7):
  - The two widget suites seed a `createTestQueryClient()` through the real query and nest a `QueryClientProvider` for it inside `setupTest`'s `render`; each gains *reads the topics without requesting them*, which waits for the rendered trigger or panel and asserts the adapter's GET history is still the seed's two requests.
  - `apiHooks.test.tsx`: the `discussionTopicsQuery` cases assert on the cache instead of the model store, and a `useDiscussionTopic` describe covers the topic for its unit, `undefined` for a unit without one, *fetches nothing on its own*, and the resolve-after-mount path. Negative check, run: with `enabled: true` in the hook, exactly the three request-count cases fail.
  - `initializeTestStore` registers the `course_topics` route from its own `unitBlocks`, with an `enabledInContext` option, beside the discussion config route it already registers. `Course.test`'s sidebar cases render the real `DiscussionsProvider`, whose query had been failing on the `onAny` fallback's empty reply and was tolerated only because the readers read the store. `test-utils.jsx` loses its seed helper and temporary adapter.
  - `SidebarContext.test.jsx`, `UpgradeTrigger.test.jsx` and `UpgradeWidgetContext.test.jsx`, which render the provider with no query client, mock the hook the way they mock `useCourseHomeMeta`; their `useModel` mocks stay for `coursewareMeta` until D3.

## Operators — breaking

- **`useModel('discussionTopics', unitId)` returns `{}`**: the model is no longer written. Read the current unit's topic with `useDiscussionTopic(courseId, unitId).data` from `./src/courseware/data/apiHooks`, populated by `DiscussionsProvider` (see *Accessing Course Data* in `src/courseware/course/sidebar/README.md`).
- **`unit` in the `SidebarWidgetContext` handed to a widget's `isAvailable` is `undefined`** (was `{}`) for a unit with no in-context discussion topic. `unit?.id`, the built-in widget's own check, is unaffected; `unit.id` throws. The declaration says so: `unit?: DiscussionTopic`.
- The `SIDEBAR_WIDGETS` config, the `Provider` field and the topics request itself are unchanged.

## Testing

`npm run types` and `npm run lint` clean; full suite 116 suites, 1172 passed, 0 skipped, with the two widget suites re-run after the review fixes. `git grep "useModel('discussionTopics'" src` is empty. Manual checks: see the checklist below.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — read discussion topics from the query, not `useModel` (#2087)

Layer C of the #1977 model-store dissolution; the fourth layer of the running
stack #2121, on top of #2116 (#2112). Entries 1–6 were settled in the plan
review on 2026-09-24 (the review that first peeled out #2111, #2112 and #2118,
then resumed once those three had PRs out) and posted to #2087; the rest
landed with the code.

1. **`unit?: DiscussionTopic`, no sentinel.** `useDiscussionTopic` returns the
   unit's topic or `undefined`, and the `SidebarWidgetContext` declaration in
   `sidebar/SidebarContext.tsx` says so, where a widget author's editor shows
   it and checked against `discussionsIsAvailable`'s own typed parameter.
   Every in-repo read is an optional chain, so `{}` → `undefined` changes
   nothing they see. The alternative, `select: topics => topics.find(…) ?? NO_TOPIC`,
   would preserve `useModel`'s exact `{}` for a JavaScript `isAvailable`
   written as `unit.id`, at the cost of a hand-made value that exists only
   for that contract. This is the line #2111's decision 7 said this layer
   would change; settled in the review that peeled #2111 out. No comment on
   the declaration (#2111, decision 13: the types carry none).

2. **Inline `select`, not `useCallback`.** The docs' concern with an inlined
   `select` is compute — "an inlined `select` function … will run on every
   render" ([Render Optimizations › select](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations#select))
   — and this one is a `find` over one course's unit topics. The reference
   stability the provider's `useCallback` dependency array needs comes from
   `find` returning an element of the cached array, unchanged while the data
   is unchanged and kept by structural sharing across a refetch, not from
   memoizing the selector. `useCallback` would be the only memoized shape,
   since the selector closes over `unitId`, and as the repo's first `select`
   it would read as a rule to memoize every select; the rule is the docs'
   own — memoize a select when it does enough work to matter.

3. **The two widget suites nest a `QueryClientProvider` for a client they
   seed.** The readers read the client the component renders under, and
   `setupTest`'s `render` builds a fresh one per call with no way to pass one
   in. `DiscussionsTrigger.test.jsx` and `DiscussionsSidebar.test.jsx` run
   the real query on a `createTestQueryClient()` against their own two
   discussion routes and nest a provider for it inside the `ui` — the
   `EnrollmentAlert.test.tsx` / `LoadedTabPage.test.jsx` shape. A
   `queryClient` option on `render` was set aside: a shared-harness change
   two callers do not justify, and F is where `render`'s options change
   anyway (it loses `store`), so that is the moment to decide them as a set.

4. **Request-count cases in both widget suites plus the hook-level test.**
   *fetches nothing on its own* (the `useIsCourseLoaded` shape) pins the
   `enabled: false` line; *reads the topics without requesting them* in each
   widget suite pins that the component goes through it — per component,
   because each suite is the sole test of its component and the widgets are
   untyped `.jsx`, where a later rewire to a fetching hook would pass every
   other test. Each flushes (`await act(async () => {})`) and asserts the
   whole GET history as an ordered URL list, the seed's config then topics,
   so a fetching reader's second config request is caught too. A composed
   count in `Course.test` needs an adapter handle the harness does not have
   (the adapter is created inside `initializeTestStore`); worth adding if
   F's test-infrastructure pass provides one. **Negative check, run:** with
   `enabled: true` in the hook, exactly those three cases fail (`fetchStatus`
   `'fetching'`; three and four requests instead of two) and the two
   pre-existing *fetches nothing on its own* cases still pass.

5. **The three suites that render the provider with no query client mock
   `useDiscussionTopic`.** `SidebarContext.test.jsx`, `UpgradeTrigger.test.jsx`
   and `UpgradeWidgetContext.test.jsx` already mock the provider's other
   query hook, `useCourseHomeMeta`, rather than supply a client (#2111,
   decision 14); the new hook gets the same treatment,
   `jest.fn(() => ({ data: undefined }))` over `jest.requireActual`. Their
   `useModel` mocks stay for `coursewareMeta` until D3 (#2089); that is the
   moment to give them a client instead, once the provider's last `useModel`
   read is gone, and the `useDiscussionTopic` mock is one of the lines D3
   deletes. `UpgradePanel.test.jsx` renders through `setupTest`'s `render`
   and so has a client; the real hook runs idle there.

6. **The `course_topics` mock route lives in `initializeTestStore`.** How it
   worked: `setupDiscussionSidebar` stacked three adapters, and the render
   ran against the second, which `initializeTestStore` had given the config
   route (`options.provider`) but no topics route; its `onAny` fallback
   answers `200, {}`, so the real `DiscussionsProvider`'s query threw on
   `.filter` and errored in every one of `Course.test`'s eight sidebar
   renders — tolerated because the readers read the store the third
   adapter's seed had filled. After this layer the readers read the render's
   client, so that route has to exist, and `initializeTestStore` is the only
   code with a handle to the adapter. It registers the topics route from its
   own `unitBlocks` through `buildTopicsFromUnits`, with a new
   `enabledInContext` option (default `true`), beside the config route; the
   seed helper, its temporary adapter and its `restore()` are deleted, and
   `setupDiscussionSidebar` passes `enabledInContext` through. Every other
   caller is unaffected: the default provider is `'legacy'`, for which the
   `queryFn` never requests topics. The alternative, a passthrough adapter
   in `test-utils.jsx`, relies on axios-mock-adapter's stacking semantics
   that nothing else in the suite uses. F later deletes the helper's seeding
   half and renames what is left; the route is fixture data for the mocking
   half that survives, so it rides along. Not renamed or restructured here.

7. **The `discussionTopicsQuery` tests keep a store-backed client for one
   reason: the app `QueryCache`.** The plan had `initializeStore()` leaving
   that describe. It cannot yet: `createTestQueryClient()` attaches the app
   cache (`createAppQueryCache(store)`, whose `onError` is what calls
   `logError`) only when given a store, because the same cache carries the
   model-store bridge and takes the store for it. The describe now asserts
   on the cache (`getQueryData` is the filtered list, `[]` for a legacy
   provider, `undefined` after the network error) and builds its client with
   `createTestQueryClient(initializeStore())`, with a comment naming why.
   The store argument goes when #1977 removes the bridge and the cache stops
   taking one. The new `useDiscussionTopic` describe needs no logging and
   uses a bare client.

8. **What the three peeled layers left this one.** The issue's task list
   named `SidebarContextProvider.jsx:35` and a prefetch; on the stack the
   third reader was `sidebar/SidebarContext.tsx:87` (#2112 merged the
   provider and context into one module), the fetch was already
   `DiscussionsProvider`'s observer (#2111), and both widget files already
   read the context through `useSidebar()` (#2112), so the trigger's context
   line only gained `courseId`. `DiscussionsProvider.test.tsx` was expected
   unchanged and is: its `fetchStatus` `'idle'` assertions hold with the
   provider's disabled observer also on the key.

9. **`idField` stays for F.** With the bridge entry gone the bridge's
   `idField` pass-through (#2016) has no user in production or in
   `setupTest.js`; per the issue body it is noted for F (#1977) rather than
   removed here, and the bridge test *updateModels keys models by idField
   instead of id* stays with it.

10. **`refactor!:` with a `BREAKING CHANGE:` footer.** No learner-visible
    change and no request-count change: one topics request per sidebar
    mount, the Provider's. For plugins: `useModel('discussionTopics', unitId)`
    returns `{}` (nothing writes the model), the replacement is
    `useDiscussionTopic(courseId, unitId).data`, and `unit` in the
    `isAvailable` context is `undefined` (was `{}`) for a unit with no topic
    — `unit?.id` unaffected, `unit.id` throws. The sidebar README's
    *Accessing Course Data* names the hook in place of its `useModel`
    holdover line, and `useModel` appears nowhere in that file now.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — read discussion topics from the query, not `useModel` (#2087)

In-browser verification against a live backend (tutor dev).

What changed: the discussions trigger, the discussions panel and the sidebar
provider's `unit` read the current unit's topic through
`useDiscussionTopic(courseId, unitId)`, a disabled observer of the query
`DiscussionsProvider` fetches, instead of the `discussionTopics` model; the
query no longer writes that model. No request or storage change intended:
still one `v1/courses/{courseId}` and one `v2/course_topics/{courseId}` per
sidebar mount, both the Provider's.

**The bugs this layer could introduce.** (1) *A reader that never sees the
data* — a disabled observer with nothing fetching its query stays `pending`
forever, so the trigger and panel would never appear and `unit` would never
be defined, with no error. Every reader renders inside the provider, where
`DiscussionsProvider` is mounted, so this should be impossible; a failure
means that assumption is wrong. (2) *A reader that fetches* — a reader
mounting after the Provider's fetch settled would refetch at `staleTime: 0`,
showing as a second `course_topics` request pair. (3) *The sync path* — the
readers must re-render when the Provider's query resolves, which is what
opens a stored `DISCUSSIONS` preference and makes the trigger appear after
load; if the disabled observers did not subscribe, both would stay closed or
hidden until something else re-rendered. (4) *`undefined` where `{}` was* —
an operator widget's `isAvailable` written as `unit.id` now throws
(documented as breaking); `unit?.id` is unaffected.

## Setup

A course with the **Open edX** discussions provider, `DISCUSSIONS_MFE_BASE_URL`
configured, and two units: one with in-context discussions **on**, one with
them **off** (Authoring → the unit's discussion setting). A legacy-provider
course if one is handy (optional; see *Not run* otherwise). Browser devtools
open on the Network tab filtered to `discussion`, and on the Console.

For bug 4, optionally a probe widget in `env.config.jsx` (untracked — check
a stale local copy is not carrying other overrides) whose `isAvailable` reads
`unit?.id` and whose panel reads
`useDiscussionTopic(courseId, unitId).data` through `useSidebar()`; remove it
afterwards.

## Checks

### Request count (bug 2) — the #2098 protocol

- [x] **Hard reload a unit with discussions on, wait for the Network tab to go idle:** `v1/courses/{courseId}` **1**, `v2/course_topics/{courseId}` **1**.
- [x] **Open the discussions panel, then navigate to the next unit and back:** no new `course_topics` request.

### The readers see the data (bugs 1 and 3)

- [x] **Unit with discussions on:** the discussions trigger is in the sidebar strip; opening it loads the iframe at `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- [x] **Unit with discussions off:** no discussions trigger, no panel; navigating between the two units flips the trigger without a new topics request.
- [x] **Trigger appears after load:** on a hard reload of a unit with discussions on, the trigger appears once the topics request resolves (the first availability check runs before it lands).
- [x] **Stored preference auto-opens:** with discussions open, reload — the panel is open again once the query resolves (the sync path). Close it, reload — closed.
- [x] **Console:** no error naming `useDiscussionTopic`, `useSidebar` or `.filter`.

### Legacy provider

- [ ] **Legacy-provider course:** `v1/courses/{courseId}` **1**, no `course_topics` request, no discussions trigger.

### Operator widget contract (bug 4, optional)

- [ ] **Probe widget:** its trigger shows on the unit with discussions on and not on the unit with them off; its panel renders the topic's `id`; no console error.

## Results

Run 2026-09-25 on tutor dev. 7 of 9 checks run, all passing; 2 not run.

**Run**

- **Request count:** on a hard reload of a unit with discussions on,
  `v1/courses/{courseId}` and `v2/course_topics/{courseId}` once each; with
  the panel open, the next unit and back added no `course_topics` request.
- **Unit with discussions on:** the trigger in the strip; opening it loaded
  the iframe at `{DISCUSSIONS_MFE_BASE_URL}/{courseId}/category/{unitId}?inContextSidebar`.
- **Unit with discussions off:** no trigger, no panel; navigating between
  the two units flipped the trigger with no new topics request.
- **Trigger appears after load:** on a hard reload the trigger appeared once
  the topics request resolved.
- **Stored preference:** discussions open, reload — open again once the query
  resolved; closed, reload — closed.
- **Console:** no error naming `useDiscussionTopic`, `useSidebar` or `.filter`.

**Not run**

- **Legacy-provider course:** not tested. Covered at the query level by
  *skips the topics request entirely for a legacy provider* in
  `courseware/data/apiHooks.test.tsx` (one request, `[]` cached), and the
  readers then find no topic, the same path the *discussions off* check
  exercised by hand.
- **Probe widget (`undefined` where `{}` was):** not tested. The value is
  pinned by *returns undefined for a unit with no topic* in the
  `useDiscussionTopic` describe, and the contract by `npm run types` checking
  `discussionsIsAvailable`'s own `SidebarWidgetContext` parameter against
  `unit?: DiscussionTopic`.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
