Part of #1946 — Redux → React Query migration (Stage 1). Follow-up from #2088's review, which found `queryClient.setQueryData<SequenceMetadataData>(…)` and `getQueryData<SequenceMetadataData>(…)` naming the cached shape by hand at each cache read and write.

**Goal:** use the typed query keys TanStack Query v5 already gives us, so imperative cache reads and writes infer their data type from the key instead of repeating it as a generic at every call site.

**Context.** `queryOptions(...)` returns its `queryKey` tagged with the query's data type (`QueryKeyWithDataTag` in `@tanstack/query-core`), and `queryClient.getQueryData` / `setQueryData` read that tag — the docs' TypeScript page, "Typing Query Options", describes this as the way to get inference at those call sites. Our key factories (`coursewareQueryKeys`, `courseHomeQueryKeys`) return plain `as const` tuples with no tag, so every `getQueryData` / `setQueryData` that reaches into the data has to carry `<SomeType>` itself, and a wrong generic would compile. `courseware/data/apiHooks.ts` already has one `queryOptions` builder (`sequenceMetadataQuery`) whose tagged key none of the imperative sites use yet; the same is true wherever a cache write patches a query's data (completion, bookmarks, sequence position, the outline sidebar roll-up).

**Tasks**
- Survey every `getQueryData<…>` / `setQueryData<…>` (and `getQueryData` on a raw key factory result) across `src`, in code and tests.
- Decide the shape: a `queryOptions` builder per query whose tagged `queryKey` the imperative sites use, with the key factories kept as the single place keys are spelled — or another form if the survey shows one fits better.
- Convert the sites; drop the hand-written generics that the tagged keys make redundant.

**Not in scope:** changing any query's key, fetch, or cache write semantics; the `enabled: false` reader pattern, which is a subscription and not an imperative read.

**Verify:** `npm run types`, `npm run lint` and the full suite green; `git grep "QueryData<" src` is empty, or each survivor has a reason.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
