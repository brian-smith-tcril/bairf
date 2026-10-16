Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layers D1 + D2**. One or two PRs — the two model types come from the same query (`useSequenceMetadata`) and share readers, so whether they land together is a call for implementation time.

**Goal:** read the `units` and `sequences` models from the courseware queries that already produce them, and move their three optimistic writes onto those queries.

**Context.** `units` comes only from `useSequenceMetadata` (plus two mutation writes). `sequences` is a **merge of two queries**: the outline query writes `{ id, title, sectionId }` for every sequence, and `useSequenceMetadata` writes the full `normalizeSequenceMetadata` shape (`unitIds`, `activeUnitIndex`, `gatedContent`, `isTimeLimited`, …) for the active one — so `useModel('sequences', id)` returns a different shape depending on which sequence it is, and each reader converts to whichever query owns the fields it reads.

**Tasks — D1, `units` (6 sites)**
- `courseware/course/sequence/Sequence.jsx:48`, `SequenceContent.jsx:48`, `Unit/index.jsx:33`, `Unit/UnitSuspense.jsx:21`, `Unit/hooks/useShouldDisplayHonorCode.js:12`, `sequence-navigation/UnitButton.tsx:37` → the `units` array of `useSequenceMetadata(sequenceId)`.
- Move the `bookmarked` write (`courseware/course/bookmark/data/apiHooks.ts:17`) and the `complete` write (`useCheckBlockCompletion`, `courseware/data/apiHooks.ts:144`) onto that query with `setQueryData`, including the mutation's `store.getState()` "already complete, don't re-check" guard (`apiHooks.ts:163-166`).

**Tasks — D2, `sequences` (11 sites)**
- Active-sequence readers → `useSequenceMetadata(sequenceId)`: `Sequence.jsx:46`, `SequenceContent.jsx:22`, `sequence-navigation/SequenceNavigation.jsx:27`, `sequence-navigation/hooks.js:12`, `Unit/hooks/useIFrameBehavior.ts:40`, `alerts/sequence-alerts/hooks.js:8,23`, `Course.jsx:35`.
- Title-only readers → the outline query: `breadcrumbs/CourseBreadcrumbs.jsx:29`, `sequence-navigation/UnitNavigationEffortEstimate.jsx:35,36`.
- Move `useSaveSequencePosition`'s optimistic `activeUnitIndex` write and its `store.getState()` rollback read (`courseware/data/apiHooks.ts:180-203`) onto the sequence query.
- Restructure `CourseBreadcrumbs`' `useModels('sequences', …)` call, which currently runs **inside `.map()`** (see below).

**Verify:** unit navigation, bookmarking, completion ticks, the honor-code gate, sequence gating/timed-exam banners and breadcrumbs all behave as before; saving a sequence position still rolls back on failure; `git grep "useModel('units'\|useModel('sequences'\|modelKeys.units" src` is empty.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **`CourseBreadcrumbs` calls hooks in a loop.** `useModels('sections', course.sectionIds)?.map(section => ({ …, sequences: useModels('sequences', section.sequenceIds) }))` (`CourseBreadcrumbs.jsx:24-29`) calls `useModels` once per section inside the map — it only survives because the array identity is stable per render. The conversion has to read the outline query once and index into its `sections`/`sequences` maps. Fixed here because the conversion forces it, not as a general cleanup.
- **`UnitNavigationEffortEstimate`'s effort branch is unreachable, and stays that way.** It bails unless `nextSequence.effortActivities || nextSequence.effortTime`, and neither writer of the `sequences` model produces those fields (they come from `course-home/data/api.js`, the outline *tab*'s blocks). That is intentional: the file's header comment records that effort estimation was lost when the LMS blocks API stopped being called, with [AA-930](https://openedx.atlassian.net/browse/AA-930) tracking its revival. Convert it verbatim, including the `Object.keys(sequence).length === 0` guards, which depend on `useModel` returning `{}`.
- **The three writers hold the last `useDispatch` calls in `courseware/data`** besides `useSaveIntegritySignature` (layer D3/D4), and two of them also read Redux state directly via `useStore()` — the completion guard and the position rollback both need a cache read to replace `store.getState()`.
