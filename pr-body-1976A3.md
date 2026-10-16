## Summary

Move the last scattered courseware status/id readers onto queries: `useIsCourseLoaded(courseId)` — the bridge's four-state composite collapsed to a boolean, since every consumer outside TabPage gates on exactly "loaded" — and `useSequenceIds(courseId)`, replacing `sequenceIdsSelector` with the same gate + flatMap over the section models. `useSequenceNavigationMetadata` and `UnitNavigationEffortEstimate` convert, and `courseware/data/selectors.js` is deleted. This is **layer A3** (of six) of the courseware slice teardown #1976 ([plan](https://github.com/openedx/frontend-app-learning/issues/1976)), stacked on the sequence-readers layer #2070. Part of #1976 — the teardown's final layer closes it.

After this layer the transitional status bridge's only remaining readers are `CoursewareContainer`, `CourseBreadcrumbs` (next layer), and `TabPage`.

## What changed

- **`courseware/data/apiHooks.ts`**: `useIsCourseLoaded` returns `metadataQuery.isSuccess && courseHomeMetaQuery.isSuccess && hasAccess && outlineQuery.isSuccess` — the bridge's `LOADED` arm as a boolean; its loading/denied/failed arms all behaved as "not loaded" for these consumers, exactly as their string comparisons did (the denied/failed distinctions live in TabPage, which takes the raw queries). `useSequenceIds` gates on it and flatMaps `coursewareMeta.sectionIds` through the sections models — model reads stay on `useModel`/`useModels` (read conversions are #1977's home), with `shallowEqual` + `useMemo` keeping the returned array referentially stable. That's a mild upgrade for these consumers: the deleted `selectors.js` version was a plain unmemoized function, so `useSelector` minted a fresh array on every store dispatch.
- **Readers converted**: `useSequenceNavigationMetadata` (`courseId` from `useParams`, gate = `isCourseLoaded && sequenceQuery.isSuccess`) and `UnitNavigationEffortEstimate`. `react-redux` leaves both files.
- **`useSequenceNavigationMetadata`'s `entranceExamData` destructure gains a `= {}` default** — it throws on the empty `coursewareMeta` model, a pre-existing landmine that the always-set slice `courseId` kept buried and route-sourced ids reach (it error-paged four test suites). One default on the hook's own read makes it total; unlike the #1997 defaults-vs-deriveView case there's no upstream invariant to restore — this hook runs during loading renders by design.
- **Deleted**: `courseware/data/selectors.js` (its `getSequenceId`/`getSequenceStatus` consumers converted in #2069) + the `courseware/data/index.js` export. The container's separate inline `sequenceIdsSelector` copy remains until the teardown layer.
- **Tests**: the coursewareMeta bridge-ordering test ("sectionIds survive when metadata resolves after the outline") now pins the survival property through `useSequenceIds` — the real consumer — instead of a dispatched slice status; a new `useIsCourseLoaded` matrix ports the course half of the status-bridge tests as booleans (per-case axios-mock overrides register *before* the happy-path mocks — first handler wins); `UnitNavigation.test` gets the established recipe (fresh store per test, real route with a splat, loaded-state waits anchored on signals that distinguish loaded, `fireEvent` → `userEvent`). `statusBridge.test` stays green alongside until the bridge dies.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (111 suites, 1131 passed / 3 pre-existing skips). Manual pass on tutor local in the details block below.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — useIsCourseLoaded + useSequenceIds (#1976, layer A3)

1. **The course composite collapses to one boolean: `useIsCourseLoaded`.**
   The bridge derived a four-state string (`loading`/`loaded`/`denied`/
   `failed`) from three queries; every consumer this layer and later touches
   (the sequence-navigation hooks, the effort estimate, A4's breadcrumbs, B's
   redirect logic) gates on exactly "loaded". The denied/failed distinctions
   live only in TabPage, which takes the raw queries (B-prep/B). So the hook
   returns `metadataQuery.isSuccess && courseHomeMetaQuery.isSuccess &&
   hasAccess && outlineQuery.isSuccess` — the bridge's `LOADED` arm as a
   boolean; its `loading`/`denied`/`failed` arms all behaved as "not loaded"
   for these consumers, exactly as their string comparisons did. No status
   strings (the A2 decision, carried through).

2. **`useSequenceIds(courseId)` replaces `sequenceIdsSelector`.** Same
   derivation: gate on loaded, then flatMap the course's `sectionIds` through
   the sections models (the gate is expressed as data —
   `useModels('sections', isCourseLoaded ? sectionIds : [])` — since hooks
   can't early-return). Model reads stay on `useModel`/`useModels`
   (query-result read conversions are #1977's home). Referential stability:
   `useModels`' `shallowEqual` keeps the sections array reference stable and
   `useMemo` keeps the flatMap result stable. That's a mild *upgrade* for
   these consumers, not just parity — the deleted `selectors.js` version was
   a plain unmemoized function, so `useSelector` re-ran it and produced a
   fresh array on every store dispatch; only the container's separate inline
   `createSelector` copy (which remains until B) ever had memoization.
   `courseware/data/selectors.js` is **deleted** (its
   `getSequenceId`/`getSequenceStatus` consumers converted in A1) and
   `courseware/data/index.js` drops the export.

3. **Readers converted:** `useSequenceNavigationMetadata`
   (`sequence-navigation/hooks.js`) takes `courseId` from `useParams`,
   `sequenceIds` from the new hook, and gates on
   `isCourseLoaded && sequenceQuery.isSuccess` (the old
   `'loaded' && 'loaded'`); `UnitNavigationEffortEstimate` takes
   `useSequenceIds(useParams().courseId)`. `react-redux` leaves both files.

4. **`useSequenceNavigationMetadata`'s `entranceExamData` destructure gains a
   `= {}` default.** `const { entranceExamData: { entranceExamPassed } } =
   useModel('coursewareMeta', courseId)` throws when the model is absent —
   a pre-existing landmine that the slice-sourced `courseId` (always set) and
   seeded test stores kept buried. With route-sourced ids, any route-less
   render reaches it (it error-paged four test suites). One default on the
   hook's own read makes it total. This is not the #1997 whack-a-mole
   situation (there, the same empty-model destructure was duplicated across
   ~8 readers and the fix belonged upstream in `deriveView`); here it's a
   single reader in the file already being edited, and the upstream "both
   loaded before render" invariant doesn't exist for this hook — it runs on
   every render of the nav components, loading included, by design.

5. **Tests.**
   - The `coursewareMeta bridge` ordering test ("sectionIds survive when
     metadata resolves after the outline") reworks around `useSequenceIds` as
     the reader — the real consumer now pins the survival property; its
     `fetchCourseSuccess` dispatch and the `sequenceIdsSelector` assertion die
     with the selector. It gains the courseHomeMeta mock the loaded gate
     needs, and asserts `[]` while metadata is still pending.
   - New `useIsCourseLoaded` matrix — the course half of the bridge test
     matrix collapsed to booleans: pending → false, all-success + access →
     true, no access → false, outline failure → false, query failure → false,
     missing id → false without fetching. Gotcha encoded in the helpers:
     axios-mock-adapter matches handlers in registration order (first wins),
     so per-case overrides register *before* the happy-path mocks.
   - `UnitNavigation.test` gets the A2 recipe: fresh store per test
     (`beforeEach` — the shared-adapter clobber), a `renderNav` helper on
     `/course/:courseId/:sequenceId/*` (links navigate mid-test), and
     loaded-state settles that wait on a signal that actually distinguishes
     loaded (an `href` appearing, or the disabled button materializing)
     rather than on elements that render identically pre-load.
   - `statusBridge.test` stays green alongside until B.

6. **Behavior deltas:** the standard posture — the nav components' query
   subscriptions can trigger background refetches where the bridge was the
   sole subscriber; results land in the model store through the same bridge.
   Otherwise faithful: same gates, same id ordering; referential stability
   improves for the two converted consumers (see 2), which is strictly less
   re-rendering, not a behavior change.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — useIsCourseLoaded + useSequenceIds (#1976, layer A3)

In-browser verification for layer A3, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX
`course-v1:OpenedX+DemoX+DemoCourse`). This layer claims **zero user-facing
change**: `useSequenceNavigationMetadata` and `UnitNavigationEffortEstimate`
derive the course-loaded gate and the ordered sequence-id list from queries
instead of the Redux mirrors. The things to watch are unit navigation's
cross-sequence links and first/last-unit states — everything that depends on
the sequence ordering and the loaded gate.

## Verify by hand

- [x] **Cross-sequence unit navigation** (`useSequenceIds` ordering) — on the
  last unit of a sequence that has a following sequence, Next links to the
  next sequence's `/first`; on the first unit of a non-first sequence,
  Previous links to the previous sequence's `/last`; both navigate correctly.
  (Bottom unit navigation is always rendered; no `env.config.jsx` needed.)
- [x] **First/last-unit states** (`isFirstUnit`/`isLastUnit` off the loaded
  gate) — first unit of the course: Previous disabled; last unit of the
  course: Next shows its end-of-course state (disabled, or the
  end-of-course/complete-course link per cert state).
- [x] **Mid-sequence navigation** — prev/next between units within a sequence
  keeps working; no flash of wrongly-disabled buttons after load settles.

## Results

All three checks passed (2026-09-16, tutor local, DemoX, run against the local
branch @ `05011cba`, before any push): cross-sequence Next/Previous land on
the following sequence's `/first` and the preceding sequence's `/last`, the
course's first unit disables Previous and its last unit shows the correct
end-of-course Next state, and mid-sequence prev/next work with no flash of
wrongly-disabled buttons after load.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
