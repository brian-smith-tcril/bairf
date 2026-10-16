## Summary

Move the sequence-status readers off the Redux `sequenceStatus`/`sequenceMightBeUnit` mirrors and onto the sequence metadata query itself. `useSequenceMetadata` absorbs the route-derived preview flag (every caller passed `pathname.startsWith('/preview')`, threaded down from the container), readers gate on the query's own `isPending`/`isSuccess`/`isError`, and the 422-means-not-a-sequence translation becomes the exported `sequenceMightBeUnit(sequenceQuery)` predicate. **The Redux status-string vocabulary is dropped, not ported** — matching how every converted course-home reader already works. This is **layer A2** (of six) of the courseware slice teardown #1976 ([plan](https://github.com/openedx/frontend-app-learning/issues/1976)), stacked on the route-id layer #2069. Part of #1976 — the teardown's final layer closes it.

The transitional status bridge keeps writing the slice for the remaining readers (container, breadcrumbs, sequence-navigation hooks) until the later layers.

## What changed

- **`courseware/data/apiHooks.ts`**: `useSequenceMetadata(sequenceId)` derives `isPreview` from the pathname itself and loses the param — one derivation, one query-key shape, every subscriber shares the container's cache entry. New `sequenceMightBeUnit(sequenceQuery)` predicate (a 422 means the requested id is not a sequence — it may be a unit id). No wrapper hook, no status strings.
- **Readers converted**: `Sequence.jsx` (`loading = sequenceQuery.isPending || sequenceMightBeUnit(sequenceQuery)` — the old failed-and-might-be-unit arm folds in since the predicate is only true on a 422 error; loaded gates on `.isSuccess`), both `alerts/sequence-alerts` hooks (gate on `.isSuccess`), and `SequenceNavigation.jsx` (render/lock gates on `.isSuccess`; its `courseId` moves to `useParams`; its `LOADED` constant import dies). `react-redux` leaves all three files.
- **A latent Rules-of-Hooks violation, surfaced by the conversion, is fixed**: `SequenceNavigation` called `GetCourseExitNavigation` (a hook — it reads two models) inside `renderNextButton()`, which only runs once the sequence is loaded. Harmless while the status never flipped within a mounted life (the slice was pre-seeded and `Sequence` unmounts the nav during loads); a hook-order error once the status derives from the query in place. The call is hoisted to the component top level. `UnitNavigation` invokes the same function unconditionally and is untouched.
- **The bridge slims**: `useSequenceStatusBridge` loses its `isPreview` pass-through (the container call updates) since the query hook now derives it.
- **Tests**: `SequenceNavigation.test` renders under a real route (`/course/:courseId/:sequenceId/*` — the splat keeps the route matched when unit-button `Link`s navigate mid-test) with a fresh store per test; `test-utils.jsx` extracts `seedDiscussionTopics`, which scopes its own axios adapter (the old inline adapter starved the sequence query after it); `Course.test` awaits the unit iframe (`testIDs.contentIFrame`) before posting `loadUnit()`'s window message (the listener mounts with the unit); the `useSequenceMetadata` describe gains the missing-id, preview-param, and predicate cases. `statusBridge.test` stays green alongside until the bridge dies in the teardown layer.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (111 suites, 1125 passed / 3 pre-existing skips). Manual pass on tutor local in the details block below.

## Decisions

<details>
<summary>Full decision log</summary>

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

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — sequence readers onto the sequence query (#1976, layer A2)

In-browser verification for layer A2, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX
`course-v1:OpenedX+DemoX+DemoCourse`). This layer claims **zero user-facing
change**: `Sequence`, the sequence-alerts hooks, and `SequenceNavigation`
derive the sequence status from the sequence metadata query instead of the
Redux mirror. The things to watch are the loading/failed gates and the
sequence-navigation next-button states (its course-exit lookup was hoisted
for the Rules-of-Hooks fix).

## Verify by hand

- [x] **Unit page loads** (`Sequence`'s status gate) — open a unit: brief
  sequence spinner, then content; navigate between sequences via the outline
  tray (each shows spinner → content, no error page, no console errors).
- [x] **Unit-id-as-sequence URL** (`sequenceMightBeUnit` keeps the spinner
  while the container redirects) — paste a unit id into the sequence slot of
  the URL (`/course/{courseId}/{unitId}`): spinner (no error flash), then the
  redirect lands on the proper `/course/{courseId}/{sequenceId}/{unitId}`.
- [x] **Sequence navigation bar** (SequenceNavigation converted + hoisted
  course-exit lookup) — with the default nav re-injected via `env.config.jsx`
  (slot `org.openedx.frontend.learning.sequence_navigation.v1`, per its
  README): tabs render after load, prev/next work, and on the **last unit of
  the course** the Next button shows its end-of-course state (disabled, or
  "Next (end of course)" / "Complete the course" per cert state).
- [ ] **Banner text alert** (sequence-alerts hooks) — open a sequence with a
  `bannerText` (staff-authored notice); the info alert renders above the
  unit. If no local sequence has one, note it and lean on the alerts suite.
- [x] **Preview route** (`isPreview` from the pathname keys the same query) —
  open a unit under `/preview/course/...` as staff: loads normally, Network
  tab shows the sequence metadata GET with `preview=1`.

## Results

Env: tutor local (DemoX), 2026-09-16, run against the local branch @ `f8db3d73`
(before any push), sequence-navigation check with the default nav re-injected
via `env.config.jsx`.

Four of five passed as described: unit pages load through the query gate
(spinner → content, no console errors), the unit-id-as-sequence URL shows the
spinner and redirects to the proper unit path (the `sequenceMightBeUnit`
path), the sequence navigation bar renders with working prev/next and the
correct last-unit Next state, and the preview route loads with `preview=1` on
the sequence metadata GET.

The **banner text alert** was not run by hand — no local sequence carries a
`bannerText` — and rests on the alerts suite, which pins the converted gate
(`sequenceQuery.isSuccess && sequence.bannerText`) at the hook level.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
