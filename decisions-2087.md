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
