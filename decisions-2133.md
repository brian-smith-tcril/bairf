# Decisions — infer imperative cache types from tagged query keys (#2133)

Follow-up from the #2088 review (#2134's decision log, entry 6), which asked why
a cache write had to be `setQueryData<SequenceMetadataData>(…)` when the key
could carry the type, and found the same hand-written generic at every
imperative cache read and write in the repo. The goal is the bare call:
`setQueryData(key, updater)` and `getQueryData(key)` with no `<Type>`, the type
coming from the key. Types and key spelling only: `queryOptions` returns its
argument unchanged at runtime and every key value is byte-identical, so no
request, key, or cache-write behavior changes and there is no manual-testing
doc.

1. **How the bare call gets its type.** `queryClient.getQueryData` /
   `setQueryData` are generic over the key and resolve the data type through
   `InferDataFromTag`: if the key carries a tag they use it, otherwise they fall
   back to the hand-written generic (default `unknown`). A key carries a tag only
   when it came out of `queryOptions(...)` (TanStack Query v5), which types its
   result as the options `& QueryKeyWithDataTag<TQueryKey, TQueryFnData, TError>`:
   the `queryKey` becomes `DataTag<TType, TValue, TError>`, the tuple intersected
   with two symbol properties (declared, never set) carrying the data and error
   types, and `TQueryFnData` is read off the `queryFn` beside it. So the type is
   declared once, on the fetch that produces it, and every read of the key
   derives it; with a raw factory key a wrong `<Type>` compiles, with a tagged
   key there is no `<Type>` to get wrong. The docs' TypeScript page, section
   "Typing Query Options"
   (https://tanstack.com/query/latest/docs/framework/react/typescript#typing-query-options),
   states it:

   > Further, the `queryKey` returned from `queryOptions` knows about the `queryFn`
   > associated with it, and we can leverage that type information to make functions
   > like `queryClient.getQueryData` aware of those types as well:
   >
   > ```ts
   > const data = queryClient.getQueryData(groupOptions().queryKey)
   > //     ^? const data: Group[] | undefined
   > ```
   >
   > Without `queryOptions`, the type of `data` would be `unknown`, unless we'd pass
   > a generic to it:
   >
   > ```ts
   > const data = queryClient.getQueryData<Group[]>(['groups'])
   > ```

   A `DataTag` is not assignable from a raw tuple, so a parameter typed with a
   tagged key has to be handed one (entry 4).

2. **Every query has a `queryOptions` function, and it is the only place its
   key is written.** Five queries already had one (`minimalCourseOutlineQuery`,
   `sequenceMetadataQuery`, `resumeBlockQuery`, `parentSequenceQuery`,
   `discussionTopicsQuery`); the other fourteen get one, named `useX` ↔ `xQuery`
   as those five are (`coursewareMetadataQuery`, `courseOutlineStructureQuery`,
   `coursewareOutlineSidebarTogglesQuery`, `courseHomeMetaQuery`,
   `datesTabDataQuery`, `outlineTabDataQuery`, `liveTabDataQuery`,
   `progressTabDataQuery`, `examAttemptsDataQuery`, `proctoringInfoDataQuery`,
   `coursewareSearchEnabledQuery`, `coursewareSearchResultsQuery`,
   `courseRecommendationsQuery`, `tourDataQuery`). Each follows #2140's
   `minimalCourseOutlineQuery` / `useMinimalCourseOutline` pair: the function
   takes the required ids, spells the key
   (`[...coursewareKey, 'sequence', sequenceId, isPreview] as const`, where
   `coursewareKey` is the hooks file's one module-level const,
   `[appId, 'courseware'] as const`) and holds the fetch plus any static options (`meta`, `retry`, `staleTime` and its
   comment); the hook keeps its signature, spreads the function (with the `!`
   where the id is optional, per #2083's seam) and adds only `enabled`. A hook
   with nothing to add passes the function straight to `useQuery`
   (`useLiveTabData`, `useCoursewareSearchEnabled`, `useCourseRecommendations`).
   As in #2140, the `queryFn` declares its return type only where the fetcher is
   JavaScript (`getCourseMetadata`, `getCourseOutline` in `api.js`);
   `courseHomeMetaQuery` takes `getCourseHomeCourseMetadata`'s declared
   `Promise<CourseHomeMeta>` as is, like #2113's `discussionTopicsQuery`.
   The line between function and hook is the one query-core's option types
   draw. `FetchQueryOptions` — what `fetchQuery`, `prefetchQuery` and
   `ensureQueryData` accept — is `QueryOptions` (`queryKey`, `queryFn`,
   `retry`, `meta`, `gcTime`, …) plus `staleTime`; everything the functions set
   is in it, so every entry point honours all of it. `enabled` is declared only
   on `QueryObserverOptions`, the `useQuery` type, alongside `select`,
   `refetchInterval` and `placeholderData`; `fetchQuery` would drop it silently
   and the key-only calls never see options at all. So the function holds what
   every entry point honours and the hook, being the observer, holds the
   observer-only options — which is why `useCoursewareSearchResults` keeps its
   `enabled: !!keyword` outside `coursewareSearchResultsQuery` even though it
   is derivable from the function's arguments, and why the test seeds can
   `fetchQuery(xQuery(...))` as is.
   Enforcing the line in types was considered and declined for now: a local
   wrapper around `queryOptions` whose parameter is `FetchQueryOptions` does
   reject `enabled` with an excess-property error and keeps the tagged key, but
   it needs a cast inside (the `queryOptions` overloads discriminate on
   `initialData`, which a generic `FetchQueryOptions` does not match), and the
   one option it would guard against is the one the hooks already own by
   convention. Not worth a sixth moving part in this layer.

3. **The five `queryKeys.ts` modules are deleted; every key use outside its
   function is `xQuery(...).queryKey`.** A first cut kept the factories and
   switched only the `getQueryData` / `setQueryData` sites, which left each key
   spelled two ways in source (`coursewareMetadataQuery(courseId).queryKey` at a
   write, `coursewareQueryKeys.metadata(eventCourseId)` at an invalidation in
   `useIFrameBehavior.ts`) with a rule the reader had to know. The survey of
   what the factories bought: their `all` prefix was referenced only by the
   factories themselves — no `removeQueries`, `resetQueries` or prefix-scoped
   `invalidateQueries` exists — and no ADR, README or plugin export named them.
   The one thing they carried that matters is the `appId` prefix, which keeps
   keys from colliding in a QueryClient shared with another app (the
   frontend-base shell, #1905); it stays, in each hooks file's prefix const.
   So the rule is now one sentence: a query's key exists in its `queryOptions`
   function, and anything that needs it asks that function. That covers the
   imperative reads and writes, the seven `invalidateQueries` in source
   (`useIFrameBehavior.ts`, `ShiftDatesAlert.tsx`, product-tours), the three
   JavaScript writes (`celebration/utils.jsx`, `streak-celebration/utils.jsx` —
   JavaScript can call the function as easily as the factory, it just gets no
   type), and every test (status reads, seeds, invalidation assertions). The
   key values do not change, which is what the issue's "not in scope" line
   protects; the issue's task list allowed "another form if the survey shows
   one fits better". The prefix is a module-level const in each hooks file, named for the
   feature (`coursewareKey`, `courseHomeKey`, `coursewareSearchKey`,
   `recommendationsKey`, `toursKey`), not exported: a first cut wrote the full literal in every
   function and the feature name repeated in each (twice in the two-query
   courseware-search file), which read worse than one const. It is not `all`
   under another name in the way that matters — nothing outside the file can
   see it, and nothing invalidates by prefix.
   The invalidation sites read as odd on review — `invalidateQueries({ queryKey:
   datesTabDataQuery(courseId).queryKey })` builds the whole query description
   (object plus `queryFn` closure; `queryOptions` returns its argument as is)
   to read one property — but it is the spelling the docs' own example uses
   for the imperative side (`queryClient.setQueryData(groupOptions(42).queryKey,
   newGroups)`), and it is now the one spelling at all seven invalidation
   sites in source. The alternatives were both rejected: passing the whole
   description as the filter, `invalidateQueries(datesTabDataQuery(courseId))`,
   type-checks only because a non-literal value may carry extra properties and
   reads as if `queryFn` and `retry` were filter fields; a key-only helper
   beside each function is the deleted factory under another name. For the
   record, since the plural name raised the question: `invalidateQueries(filters?,
   options?)` takes a `QueryFilters` object, not a key — `queryKey` (a prefix
   match unless `exact`), `type` (`'all'` / `'active'` / `'inactive'`),
   `stale`, `fetchStatus`, `predicate`, plus `refetchType` for which matched
   queries refetch (default `'active'`, so an unobserved query just goes stale)
   — and the options apply to that refetch (`cancelRefetch`, `throwOnError`).
   With a full key the prefix match selects that one query; `queryKey` is the
   only filter field this app uses.

4. **`useCourseHomeMeta` drops its `RequestError` generic, and `TabPage.tsx`'s
   `CourseStatus` drops it with it.** `RequestError` (`data/http-error.ts`) is
   `{ response?: { status?; data? } }`: every field optional, not an `Error`
   subtype. Under the weak-type check `UseQueryResult<CourseHomeMeta>` and
   `UseQueryResult<CourseHomeMeta, RequestError>` are not assignable either way,
   and a data-only `queryOptions` function cannot be spread into
   `useQuery<CourseHomeMeta, RequestError>` because its callback-typed options
   (`retry`, `enabled`, `staleTime`, …) carry `Query<…, Error, …>`. Nothing reads
   the query's `error` through its type: `TabPage.tsx` and
   `CourseAccessErrorPage.jsx` go through `getErrorDetail(error: unknown)`, which
   applies the `RequestError` view inside. So `RequestError` stays what the two
   helpers in `http-error.ts` use to look at an unknown error, not a claim the
   hook makes about what it throws. Rejected: spelling all four generics on the
   function (`queryOptions<CourseHomeMeta, RequestError, CourseHomeMeta, …>`;
   TypeScript has no partial inference, and it would be one function unlike the
   others to keep an error type whose only consumer is a prop declaration).

5. **`updateSequenceUnit`'s key parameter is `SequenceMetadataQueryKey`, a
   module-private alias for `ReturnType<typeof sequenceMetadataQuery>['queryKey']`
   defined beside the helper,** and its body drops the generic. The pre-#2133
   signature was already derived from a function (`ReturnType<typeof
   coursewareQueryKeys.sequence>`); the `['queryKey']` index is new because the
   key now sits on an options object. On review the inline indexed access read
   badly in a parameter list, so it is named once; the alias lives in this file
   because `sequenceMetadataQuery` does. Rejected on review: `DataTag<QueryKey,
   SequenceMetadataData, DefaultError>` (spells the tag by hand, and
   `DataTag`'s error slot defaults to an unset marker that the real key does
   not match); loosening the parameter to `QueryKey` and restoring
   `setQueryData<SequenceMetadataData>` (the generic this layer removes, and it
   would accept any key). Its two callers (`useCheckBlockCompletion` and
   `bookmark/data/apiHooks.ts`) pass `sequenceMetadataQuery(sequenceId, isPreview).queryKey`.
   Rejected: changing the signature to `(queryClient, sequenceId, isPreview, unitId, patch)`
   and building the key inside — fewer characters per caller, but a signature
   change the issue does not ask for.

6. **The sidebar outline's `| null` lives in `courseOutlineStructureQuery`.**
   `getCourseOutline` (`courseware/data/api.js`) returns `null` when the
   response has no `blocks`. The function's
   `queryFn: (): Promise<CourseNavigationOutline | null>` carries it, so the read
   in `useCheckBlockCompletion` (which keeps its `if (!cachedOutline) return`)
   and the test helper inherit it instead of each restating it. The test helper
   keeps its `!`: it asserts the seed happened.

7. **Tests: hand generics go, invented shapes go.** Three test sites named a
   one-field type inline (`<{ courseAccess: { hasAccess: boolean } }>`,
   `<{ userNeedsIntegritySignature: boolean }>`, and an updater parameter
   annotated `(meta: { tabs: … })`); they compiled only because a raw key gave
   `getQueryData` nothing to check against — the hazard the issue describes, in
   the repo's own tests. The `CourseNavigationOutline` import stays in
   `courseware/data/apiHooks.test.tsx` for a hand-built fixture's annotation,
   which is not a cache read. Two test files `jest.mock` a hooks module with a
   bare factory and exercise code that now reaches a query function from it;
   `useIFrameBehavior.test.js` spreads `jest.requireActual(...)` into both of
   its mocks so the functions are real and only the hooks are stubbed. One
   local named `courseHomeMetaQuery` (a query *result*, in
   `CourseBreadcrumbsSlot/index.test.tsx`'s gate component) shadowed the
   imported function and is `courseHomeMetadataQuery`; the same-named locals in
   `useIsCourseLoaded`, `CoursewareContainer.tsx` and `CourseExit.jsx` do not
   import the function and are left alone.

8. **The two partial seeds are fetched through the real query, as the other
   seeded suites do.** The `useSaveIntegritySignature` suite seeded
   `{ userNeedsIntegritySignature: true }` and the bookmark suite seeded
   `{ sequence: {}, units: [{ id, bookmarked: false }] }`; `CoursewareMeta` has
   about thirty required fields and `SequenceMetadata` twelve. Both now put the
   entry in the cache the way `useCheckBlockCompletion`'s and
   `useSaveSequencePosition`'s suites (and `BookmarkButton.test.jsx`) already do:
   mock the endpoint with the factory-built response and
   `await queryClient.fetchQuery(xQuery(...))` in `beforeEach`, so the cache
   holds exactly what the query stores (#2088's decision log records this as the
   seeding form, over a hand-written shape). The integrity suite builds its
   course metadata with `user_needs_integrity_signature: true`; the bookmark
   suite builds its sequence from `buildSimpleCourseBlocks` and takes
   `sequenceId` / `unitId` from the built blocks. The integrity suite's comment
   that the fragment was deliberate goes with the fragment. Rejected: seeding
   under a raw key and reading under the tagged one (the issue's out-of-scope
   line is about production cache writes, and a test fixture is not one);
   `as CoursewareMeta` on the fragment (a wrong type that compiles);
   `normalizeX(Factory.build(...))` straight into `setQueryData`, which mistakes
   the suites' expected-value computations for their seeding form. Entry 9 is
   why the fragments compiled under either key.
   One thing the bookmark fragment stated that the fetched seed leaves
   implicit: the units start `bookmarked: false`. That now comes from the
   factory chain — `buildSimpleCourseBlocks` builds unit blocks with no
   `bookmarked` field, the `sequenceMetadata` factory fills each item with
   `unitBlock.bookmarked || false`, and the normalizer copies it. The one
   assertion that depends on the start value is the "other sequence" test's
   `bookmarked: false` check (the create tests assert the flipped value and the
   delete-fails test asserts the revert to `true`, the opposite of the requested
   value, not a return to the seed). Left implicit: a precondition assertion or
   setting `bookmarked: false` on the built block would restate the factory's
   default, which is the real shape of an unbookmarked unit.
   The integrity suite shows the same move from the other side. Before, its
   `Factory.build('courseMetadata')` supplied only a `courseId` and the flag
   lived in the hand fragment; the factory default is
   `user_needs_integrity_signature: false` and never reached the cache. With
   the seed fetched through the query, the factory response is the cache entry,
   so the flag moves to the build call
   (`Factory.build('courseMetadata', { user_needs_integrity_signature: true })`),
   the mocked `metadataUrl` appears because the seed now needs an endpoint,
   and `needsSignature` loses its hand generic to the tagged key.

9. **What the project's TypeScript checks today, and what waits.**
   `@tanstack/query-core` 5.104.2's typings use the `NoInfer` builtin
   (TypeScript 5.4) on `setQueryData`'s updater and return, and the docs'
   TypeScript page says TanStack Query "supports TypeScript versions released
   within the last 2 years. At the moment, that means TypeScript **5.7** and
   newer." This repo compiles with TypeScript 4.9.5, transitive via
   `@openedx/frontend-build` → `@edx/typescript-config` (every published version
   pins `^4.9.4`; it also sets `skipLibCheck: true`, so the unresolved `NoInfer`
   is not an error and resolves to `any`). Probed with the project's compiler and
   flags:
   - `getQueryData(taggedKey)` infers the data type. Every read site in this layer
     is typed by its key.
   - `setQueryData`'s updater parameter and value are `any` under a tagged key and
     were `any` under the removed hand generics alike; `setQueryData(key, { nope: 1 })`
     compiles either way, and `noImplicitAny: false` keeps the implicit `any`
     quiet. So the writes are exactly as unchecked after this layer as before.

   The write-side check this issue is after arrives when the project's TypeScript
   reaches 5.4, which the frontend-base port (#1905) brings (`@openedx/frontend-base`
   ships `^5.6.3`); the tagged keys are in place for it. Not claimed: that a wrong
   `setQueryData` value or updater fails to compile today.

10. **Survivors.** None of the `QueryData<` form: `git grep "QueryData<" src`
    is empty. The three JavaScript writes in `celebration/utils.jsx` and
    `streak-celebration/utils.jsx` use `courseHomeMetaQuery(courseId).queryKey`
    like everything else but get no type until the files are TypeScript.
