Part of #1946 — Redux → React Query migration (Stage 1). Layer on top of #2087 (PR #2122); #2088 stacks on it.

**Goal:** fetch the sequence metadata once per navigation into a sequence, from `CoursewareContainer`, instead of once more for each descendant that observes the query after it has settled.

**Context.** `useSequenceMetadata(sequenceId)` sets no `staleTime`, so its data is stale the moment it lands, and React Query's default `refetchOnMount` refetches whenever a fetching observer mounts onto stale data. `CoursewareContainer` and `useCoursewareRedirects` observe the query from the first render, and that fetch is the one that should count. Five more fetching observers sit under the gate — `Sequence.jsx`, `SequenceNavigation.jsx`, `CourseBreadcrumbs.jsx`, both `sequence-alerts` hooks and `sequence-navigation/hooks.js` — and they mount later: `Sequence` once `LoadedTabPage` lets children through, `SequenceNavigation` / `UnitNavigation` once `Sequence` sees `isSuccess`. Each of those mounts lands on settled data and refetches it. In the jest harness `CoursewareContainer`'s request-count case sees `/api/courseware/sequence/{id}` requested **twice** per load; the browser count is to be confirmed with the protocol below. It is the same defect #2098 fixed for the three course-level queries; the sequence query was outside that layer's scope. Same fix: the owner fetches, observers under it only read.

None of this is introduced by #2088, but #2088's two layers convert every one of those five readers, so the fix is peeled out first rather than landing in passing.

**Tasks**
- Add `{ enabled }` to `useSequenceMetadata` (the `QueryOptions` shape of `useCoursewareMetadata` / `useCoursewareOutline`).
- The five under-gate observers pass `{ enabled: false }`. `CoursewareContainer` and `useCoursewareRedirects` keep fetching through the calls they already make. No reader conversions; each file's `useModel` reads stay for #2088.
- `src/tests/MountCourseQueryHooks.tsx` takes an optional `sequenceId` and mounts `useSequenceMetadata` when given one, so the `Sequence`, `SequenceNavigation`, `UnitNavigation` and `CourseBreadcrumbs` suites — which today get their sequence data from the component's own observer — mount the owner beside the component, the #2098 shape.
- A *requests the sequence metadata once per load* case beside #2098's in `CoursewareContainer.test.jsx`, and the hook-level *fetches nothing on its own* case for `{ enabled: false }`.
- Re-measure with the protocol below.

**Verify:** hard-reload a unit, wait for idle: `/api/courseware/sequence/{id}` is requested once. Navigate to another unit in the same sequence: no new request. Navigate to a unit in another sequence: one request for the new sequence. Sequence gating, hidden-after-due, the banner-text and entrance-exam alerts, breadcrumbs and unit navigation behave as before.

**Out of scope:** `staleTime` on the sequence query (the owner's refetch on navigation is legitimate — `position` and per-unit `complete` / `bookmarked` come from this endpoint); the `useModel('units' | 'sequences', …)` reads in the same files (#2088).

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
