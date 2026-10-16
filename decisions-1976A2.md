# Decisions — sequence readers onto the sequence query (#1976, layer A2)

1. **Readers consume `useSequenceMetadata` directly — no wrapper hook, no
   status strings.** Two review rounds shaped this. A first draft added a
   `useSequenceStatus` hook returning the Redux `'loading'`/`'loaded'`/
   `'failed'` strings for drop-in minimalism; rejected — every converted
   course-home reader already speaks query flags, nothing outside the dying
   slices uses those constants, and porting the vocabulary would just
   schedule a second sweep to remove it. A second draft had the wrapper
   return `{ sequenceQuery, sequenceMightBeUnit }`; also rejected — getting
   the query out of a hook named "status" was a smell, and the wrapper's
   only other job (deriving `isPreview`) belongs lower (see 2). End state:
   readers call the query hook and gate on `isPending`/`isSuccess`/`isError`
   (1:1 with the old string comparisons), and the 422→might-be-a-unit
   translation (error-as-data) is a plain exported predicate,
   `sequenceMightBeUnit(sequenceQuery)`. A missing `sequenceId` reproduces
   the slice's initial loading state (`enabled: !!sequenceId` keeps the query
   pending, no fetch), matching the bridge's bail-without-dispatch. No
   dispatch, no effect — the one-effect-tick lag is gone.

2. **`useSequenceMetadata` absorbs the route-derived preview flag.** Every
   caller passed `pathname.startsWith('/preview')`, threaded from the
   container — preview-ness is a property of the route, so the hook derives
   it itself and the `isPreview` param drops. One derivation, one query key
   shape, every subscriber shares the container's cache entry. The
   transitional `useSequenceStatusBridge` loses its pass-through param along
   the way (container call updated).

3. **Readers converted:** `Sequence.jsx` (its
   `loading = 'loading' || ('failed' && mightBeUnit)` becomes
   `sequenceQuery.isPending || sequenceMightBeUnit(sequenceQuery)` — the
   predicate is only true on a 422 error, so the failed arm folds in), both
   `alerts/sequence-alerts` hooks (gate on `.isSuccess`), and
   `SequenceNavigation.jsx` — the destructurer deferred from A1 — whose
   `courseId` moves to `useParams` in the same touch and whose `LOADED`
   constant import dies with the string comparison. `react-redux` leaves all
   three files.

4. **A latent Rules-of-Hooks bug surfaced and is fixed here.**
   `SequenceNavigation` called `GetCourseExitNavigation` (a hook — it reads
   two models via `useModel`) inside `renderNextButton()`, which only runs
   when `sequenceStatus === LOADED`. That never manifested because the slice
   status was already `loaded` before the nav ever mounted, and `Sequence`
   unmounts the nav during loads — the status never flipped within a mounted
   life. With query-derived status the flip happens in place (loading →
   loaded), the hook count changed between renders, and React threw straight
   into the AppProvider error boundary. Fix: the call is hoisted to the
   component top level (unconditional — the only legal shape; gating it any
   later still varies the hook order). Running it pre-load is safe: its
   `useModel` reads hit models that are populated before any sequence renders
   (course metadata gates the page), and its result is only consumed in the
   loaded branch. `UnitNavigation` has the same call but invokes it
   unconditionally on every render, so it's left alone.

5. **Test-infrastructure findings** (these shaped most of the diff):
   - **Every `initializeTestStore` call replaces the shared axios adapter** —
     `new MockAdapter(client)` clobbers the previous adapter's handlers. That
     was invisible while components read seeded Redux state; now that they
     fetch, any test rendering against an *earlier* store's mocks starves.
     `SequenceNavigation.test` moves its shared store from `beforeAll` to
     `beforeEach`; `test-utils.jsx` extracts `seedDiscussionTopics`, which
     scopes its own adapter (create → mock the two discussion endpoints →
     prefetch → `restore()`), so the render afterwards runs against
     `initializeTestStore`'s fully-mocked adapter instead of a lingering
     discussion-only one.
   - **`SequenceNavigation.test` renders under a real route**
     (`/course/:courseId/:sequenceId/*` via a `renderNav` helper) — the
     component needs `useParams`, and the splat keeps the route matched when
     unit-button `Link`s actually navigate mid-test (under the old
     route-less `BrowserRouter` clicks changed nothing).
   - **`Course.test`'s `loadUnit()` calls fire before the iframe exists** now
     that `Sequence` loads asynchronously — the loaded-postMessage went to
     nobody and the unit spinner never cleared. Those tests await the iframe
     before posting. Gotcha for future debugging: the unit iframe loader
     shares the exact "Loading learning sequence..." message with `Sequence`'s
     own gate, so "spinner still present" can implicate the wrong component.
   - The hook's test matrix ports the sequence half of `statusBridge.test.ts`
     (which stays green alongside until the bridge dies in B) plus a
     preview-route case asserting the `preview=1` request param. JS
     default-param gotcha: an explicit `undefined` argument triggers the
     default, so the missing-id case passes ids explicitly.

6. **Behavior deltas:** the standard conversion posture — later-mounting
   subscribers (Sequence, alerts) can trigger a background refetch of
   sequence metadata where the bridge was the sole subscriber (`staleTime`
   0); results land in the model store through the same bridge. The
   Rules-of-Hooks fix means `GetCourseExitNavigation`'s model reads now run
   during the loading render too (result unobserved until loaded). Otherwise
   faithful: same decision points, same 422 semantics — expressed as query
   flags instead of the retired status strings.
