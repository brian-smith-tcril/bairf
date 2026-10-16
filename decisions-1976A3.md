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
