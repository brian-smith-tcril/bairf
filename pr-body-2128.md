## Summary

The six readers of the `units` model — `Sequence`, `SequenceContent`, `Unit`, `UnitSuspense`, `useShouldDisplayHonorCode` and `UnitButton` — read the unit through a new hook, `useUnit(sequenceId, unitId)` in `courseware/data/apiHooks.ts`, and the sequence query drops its `units` bridge entry, so nothing writes that model any more. The hook spreads the query's options with `enabled: false` and a `select` that finds the unit in the sequence's `units`: it never fetches, because `CoursewareContainer` owns that fetch (#2123), and a disabled observer subscribes to the same cache entry. The two writers that used to dispatch to the store — `useSetBookmarked` and `useCheckBlockCompletion` — patch the cached sequence with `setQueryData` at its exact key and drop `useDispatch` / `useStore`; the outline sidebar's completion check now names the sequence of the unit being left, which on a cross-sequence click changes where the `get_completion` request goes (see *What changed*). `SequenceContent`'s `!unit` guard is reachable again: a URL naming a unit that is not in its sequence renders "There is no content here." — #98's handling of a deleted unit, dead since #808 made `useModel` return `{}` for a missing id. **No request-count change**: `useUnit` never fetches. **Breaking for operators** — see below. Part of the Redux → React Query migration (#1946, Stage 1); layer D1 of the model-store dissolution (#1977), built on #2123 and #2125. Part of #2088 (layer B closes it).

## What changed

- **`useUnit(sequenceId, unitId)`**, the `useDiscussionTopic` shape (#2087): inline `select`, `enabled: false` hard-coded, `undefined` for a unit not in the sequence. Beside it: `sequenceMetadataQuery(sequenceId, isPreview)` as the query's `queryOptions` builder (the suites seed clients through it); `useIsPreview()` as the one derivation of the key's preview flag, used by the query and both writers; `updateSequenceUnit(queryClient, key, unitId, patch)` to patch one unit of a cached sequence, a no-op when that sequence is not cached. `SequenceUnit` names every field the normalizer produces plus the writer-only `bookmarkedUpdateState` (decisions 1, 4, 5).
- **Readers.** `Sequence`, `SequenceContent`, `UnitButton` read with their own `sequenceId`; `SequenceContent` threads `sequenceId` to `Unit`, which passes it to `UnitSuspense` and the honor-code hook — as a prop, not from the route, after the route version crashed every suite that renders the unit subtree without params (decision 2). `Unit` guards its own read (`if (!unit) return null` after the hooks) so its type is honest without an assertion (decision 11). `UnitButton` keeps its two-term `contentType` read; `UnitIcon`'s `type` prop becomes optional, which its `default:` branch already implemented — its TypeScript conversion is #2127, blocked on the repo's mixed FontAwesome majors (decision 6).
- **The awakened guard** (decision 3). A unit id that is not in a non-empty sequence renders the no-content message instead of that unit under the wrong sequence with confused navigation; no redirect rule catches that URL, and nothing in the app produces it. A sequence with no units is unchanged: the redirect's no-units branch strips any unit id first, on every layer (verified by hand on the layer below). The one existing case that depended on the sentinel — a foreign unit in an empty sequence, clicking navigation that only rendered because of `{}` — is replaced by cases for the two states the app reaches; its one unique branch, `logEvent`'s no-units arm, is covered directly now that `logEvent`'s body is `logSequenceEvent`, exported.
- **Writers** (decision 5). `useSetBookmarked(sequenceId, unitId, bookmarked)` gains the sequence id; `BookmarkButton` takes it as a prop, from `unit.sequenceId`. `useCheckBlockCompletion` reads its already-complete guard from the cache. The outline sidebar called `checkBlockCompletion(courseId, sequenceId, activeUnitId)` with the *clicked* row's sequence and the unit being *left* (that way since #1375); it now passes `activeSequenceId`, so a cross-sequence click posts to the handler of the sequence that contains the unit. The one semantic the cache write does not carry over: the store created a record for a unit with no entry; the cache write for an uncached sequence writes nothing.
- **Bridge.** The `units` mirror leaves the sequence query's `meta`; `modelKeys.units` is gone (decision 7).
- **Tests** (decisions 8–9). Suites that read the seeded store mount the container's fetches beside the component and read the cached unit; the two writer suites assert on the cache (the bookmark hook suite seeds one minimal entry by hand, the completion suite through the real query for its outline roll-up); `UnitSuspense` and `useShouldDisplayHonorCode` mock `useUnit` beside their `useModel` mock for `coursewareMeta` (D3's); `SidebarUnit.test` pins the sequence the sidebar's completion request names; two direct `logSequenceEvent` cases. Negative check, run: with `useUnit` fetching, exactly the hook's *fetches nothing on its own* and #2123's request-count case fail.

## Operators — breaking

- **`useModel('units', unitId)` returns `{}`**: the model is no longer written. Read the unit with `useUnit(sequenceId, unitId).data` from `./src/courseware/data/apiHooks`; it is `undefined` for a unit not in the sequence.
- **`BookmarkButton`** (exported from `./src/courseware/course/bookmark`) takes a required `sequenceId` prop.
- **`UnitTitleSlot`'s `unit`**, the same object in its `pluginProps`, is now the typed `SequenceUnit` and carries `sequenceId`; its other fields are unchanged.
- **A unit under the wrong sequence in the URL.** A unit that renders at `/course/{courseId}/{its own sequence}/{unitId}` now renders "There is no content here." at `/course/{courseId}/{another sequence with units}/{unitId}`, where it used to render under that sequence with navigation that did not match it. Nothing in the app links to that form, and a sequence *without* units already redirects such a URL to the sequence itself.
- The `get_completion` request for a cross-sequence outline-sidebar click now names the sequence being left, not the one clicked into.

## Testing

`npm run types` and `npm run lint` clean; full suite 116 suites, 1187 passed, 0 skipped. `git grep "useModel('units'\|modelKeys.units" src` is empty. Manual checks on tutor dev, a minimal pass of the write path with the sidebar request baselined on the layer below: see the checklist.

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — read units from the sequence query, not `useModel` (#2088, layer A)

Layer D1 of the #1977 model-store dissolution; the sixth layer of the running
stack #2121, on top of #2124 (#2123), branch `bsmith/units-query-reads`.
Part of #2088 (layer B closes it). Entries 1, 3–5 and 7 were settled in the
#2088 plan review (2026-09-25, posted to #2088); 2 was revised during
implementation; the rest landed with the code.

1. **`useUnit(sequenceId, unitId)`: a disabled `select` observer of the
   sequence query.** `useQuery({ ...sequenceMetadataQuery(sequenceId,
   isPreview), enabled: false, select: ({ units }) => units.find(unit =>
   unit.id === unitId) })`, the `useDiscussionTopic` shape (#2087, entries
   1–2): inline `select`, no `useCallback`, `undefined` for a unit not in the
   sequence, never fetches because `CoursewareContainer` owns the fetch
   (#2123). The plan's D1 note against per-model hooks was written for the
   one-line `.data ?? {}` reads; six copies of a `find` over the units array
   is what that note was avoiding in the other direction.

2. **`sequenceId` reaches the id-only readers as a prop, not from the
   route — revised from the posted plan.** The plan (A2) had `Unit`,
   `UnitSuspense` and `useShouldDisplayHonorCode` read `useParams().sequenceId`,
   on the precedent of `UnitButton` and the navigation hooks. Implemented that
   way, every suite that renders the unit subtree without route params
   (`Course.test`, `SequenceContent.test`, the Sequence suite's navigation
   cases) crashed on `unit.title` of an undefined unit: the router coupling
   put a production invariant (there is always a `:sequenceId`) onto suites
   that had never needed one. `SequenceContent` now passes `sequenceId` to
   `Unit`, which passes it to `UnitSuspense` and the hook's argument object;
   three propTypes entries, no router reads. `UnitButton` keeps
   `useParams()`, which it already used for its link.

3. **`undefined` where `{}` was; `SequenceContent`'s `!unit` guard wakes
   up.** Every reader takes an optional read (`unit?.title`, `?? {}` on the
   one destructure that stays). The guard's history, from the plan review:
   #60 (2020-05) returned the message on `unitId === null`; #98 (2020-07,
   TNL-7288) changed it to `!unitId || !unit` to handle deleted units, when
   `useModel` returned `undefined` for a missing id; #570 (2021-07) made a
   missing *type* return `{}`; #808 (2022-02, AA-1018) extended `{}` to a
   missing id to fix a course-home-to-courseware error, its author noting
   "there was code that depended on each behavior", and patched the one
   dependent a test caught (`UnitNavigationEffortEstimate`, layer B's
   `Object.keys` guards); `SequenceContent` broke no test and went dead. A
   URL naming a unit that is not in the sequence now renders "There is no
   content here." instead of an iframe the LMS then fails to load. Pinned by
   *displays the no-content message for a unit that is not in the sequence*
   in `Sequence.test.jsx`.

   **One existing case tested a state the app cannot enter.** *handles the
   navigation buttons for empty sequence* (TNL-7268, 2020-06) rendered
   `Sequence` for a sequence with no units together with a unit id from
   another sequence, and clicked previous/next to reach the handlers'
   empty-`unitIds` branches and `logEvent`'s `: 0` arm. It passed on the store
   because `useModel('units', id)` looked the unit up by id, with no regard
   for which sequence was on screen; `useUnit` looks inside the named
   sequence's entry and finds nothing, and the awakened guard renders the
   no-content message. Checked by hand on the layer below (2026-09-25): the
   app never reaches that state anyway — `sequenceUnitMarkerToSequenceUnitRedirect`'s
   no-units branch (`redirects.ts:216`) sends `/course/{c}/{seq}/{anything}`
   to `/course/{c}/{seq}` for a sequence with no units, so `Sequence` only
   ever sees an empty sequence with no unit id, which renders the no-content
   message and no navigation on every layer. The case is replaced by *shows
   the no-content message for a sequence with no units*, the state the app
   does enter. Measured with the original case removed: the only coverage it
   uniquely held was the `: 0` arm of `logEvent`'s `currentIndex` (a
   tracking-payload adjustment for a sequence with no units), which an
   operator's `SequenceNavigationSlot` override can still reach. `logEvent`'s
   body is lifted out of the component as `logSequenceEvent(eventName, {
   sequence, unitId, widgetPlacement, targetUnitId })`, exported, with the
   in-component `logEvent` a one-line wrapper so the call sites are
   unchanged, and two direct cases cover the payload, the no-units arm
   included (settled in review, over stubbing the slot or filling it with a
   real plugin). The handlers' first/last-unit branches stay covered by the
   neighbouring cases. Not covered here: a unit id that is not in a
   *non-empty* sequence, which no redirect rule catches — on `master` the
   sentinel rendered that unit under the wrong sequence, on this layer it is
   the no-content message; reachable only by editing the address bar.

4. **Types.** `SequenceUnit` names every field `normalizeSequenceMetadata`
   produces — the normalizer is ours, so no index signature — plus
   `bookmarkedUpdateState?: 'loading' | 'loaded' | 'failed'`, the one field
   the endpoint never sends and `useSetBookmarked` writes. `SequenceMetadata`
   is the `CoursewareMeta`-style placeholder (index signature, comment naming
   layer B). `SequenceMetadataData` is the query result. `sequenceMetadataQuery(
   sequenceId, isPreview)` is a `queryOptions` export like
   `discussionTopicsQuery`, which `useSequenceMetadata` and `useUnit` spread
   and the suites use to seed a client through the real query
   (`queryClient.fetchQuery(sequenceMetadataQuery(id, false))`) rather than a
   hand-written shape (#2098, entry 3).

5. **Writers address the exact cache entry; one key derivation.** The
   sequence key carries the route's preview flag, so `useIsPreview()` is
   exported beside the query and every hook that reads or writes the key
   takes the flag from it; no writer reads the route on its own.
   `updateSequenceUnit(queryClient, queryKey, unitId, patch)` patches one
   unit of a cached sequence and is a no-op when that sequence is not cached
   (the updater returns `undefined`). Consequences:
   - `useSetBookmarked(sequenceId, unitId, bookmarked)` gains the sequence
     id; `BookmarkButton` takes a `sequenceId` prop, which `UnitTitleSlot`
     passes from `unit.sequenceId`, and the slot's `unit` shape names it.
   - `useCheckBlockCompletion`'s guard reads the cached unit's `complete`;
     the sidebar's call passes `activeSequenceId` (from the route) with the
     active unit instead of the clicked unit's sequence (`course-outline/
     hooks.js:80`, that way since the sidebar was created in #1375). On a
     cross-sequence click the `get_completion` request now goes to the
     sequence that contains the unit. `handleUnitClick` drops its unused
     `sequenceId` and `UnitLinkWrapper` stops passing it. Pinned by *sends the
     completion check for the unit navigated away from to its own sequence,
     not the one navigated to* in `SidebarUnit.test.jsx`.
   - The one semantic the cache write does not carry over: the store's
     `update` created a record for a unit with no entry; the cache write for
     a sequence that is not cached (or a unit not in it) writes nothing.
     Nothing reads a unit that has not been fetched. Pinned by *proceeds to
     the request for a sequence with no cache entry, and writes nothing* and
     *writes nothing for a sequence with no cache entry* (both renamed in
     layer B's review from *… when the sequence is not cached* / *… that is
     not cached*, amended here so the names stay with the layer that wrote
     them).
   Rejected in the plan review: addressing by unit id across every cached
   sequence entry (`setQueriesData` over a prefix), which reproduced the
   store's lookup but wrote by scanning entries the cache keys by request,
   and existed mainly to keep the sidebar's mis-keyed call out of the diff.

6. **`UnitIcon`'s `type` becomes optional, in JavaScript; `UnitButton`
   passes `contentType` through as it is.** With `useModel`'s `any` gone,
   TypeScript sees `contentType` undefined when the unit is not loaded and no
   fallback prop was passed, against `UnitIcon`'s `propTypes` `.isRequired`.
   That state already reached `UnitIcon`'s `default:` branch on `master`; the
   `propTypes` were stricter than the component, so `type` is now optional
   and `UnitButton` keeps the two-term read, `unit?.contentType ??
   fallbackContentType`, the destructuring default it replaced. Converting
   the file instead, as #2125 did for the four components this layer edits,
   was tried and backed out: the one line that renders the icon fails
   `npm run types` (`IconDefinition` is not assignable to `IconProp`) because
   the repo mixes FontAwesome majors — `free-solid-svg-icons` 5.15.4 with its
   nested `common-types` 0.2.x against the hoisted `fontawesome-svg-core` /
   `common-types` 6.7.2 — and no `.tsx` file passes an icon to
   `FontAwesomeIcon` yet. The conversion is #2127, gated on aligning those
   majors. A first version substituted `?? 'other'` in `UnitButton`, the
   case whose icon matches the default branch; rejected in review as an
   invented value standing in for a type that should have allowed its
   absence.

7. **Bridge: the `units` mirror leaves `sequenceMetadataQuery`'s `meta`;
   `modelKeys.units` goes from `Unit/constants.ts`** (`coursewareMeta` stays
   for D3). `seedSequenceModels` keeps seeding `units` into the store until
   F, harmlessly; `getTestStoreIds` still reads `models.sequences`.

8. **Suites read the client the component renders under, seeded through the
   real query.** `UnitButton`, `SequenceContent`, `Unit/index`,
   `SequenceNavigationDropdown` mount `MountCourseQueryHooks` with the
   sequence id beside the component, at a route with `:sequenceId` where the
   component reads the route (#2123's helper). `Unit/index.test` renders
   `Unit` beside the owner and awaits its output: `Unit` returns `null`
   until `useUnit` has the unit (see the note below), so no test-side gate
   is needed. `BookmarkButton.test` nests a
   `QueryClientProvider` for a client it seeds (#2087, entry 3) and asserts
   on the cached unit in place of `store.getState().models.units`; the two
   writer suites do the same with a `MemoryRouter` for `useIsPreview`. The
   bookmark hook suite seeds a minimal entry by hand,
   `{ sequence: {}, units: [{ id, bookmarked: false }] }`, rather than a
   factory-built sequence through the real query — settled in review: the
   hook touches only `units[].id` and the patched fields, and the factory
   setup was more than that dependency warranted. The completion suite keeps
   the real query, since its outline roll-up reads the real unit ids.
   `UnitSuspense.test` and `useShouldDisplayHonorCode.test` mock `useUnit`
   (`{ data }`) beside their `useModel` mock for `coursewareMeta`, which D3
   removes.

9. **`useShouldDisplayHonorCode` with no unit yields `undefined`, and the
   new case says so.** `setShouldDisplay(userNeedsIntegritySignature &&
   graded)` with `graded` undefined stores `undefined`, exactly as it did
   with `useModel`'s `{}`; *does not display while the unit is not loaded*
   asserts `toBeUndefined()` with a comment, rather than `false`, which the
   hook does not produce there.

10. **Commit: `refactor!:` with a `BREAKING CHANGE:` footer.** No
    learner-visible change except decision 3's, and no request-count change
    (`useUnit` never fetches; the count is #2123's). For plugins:
    `useModel('units', unitId)` returns `{}`, the replacement is
    `useUnit(sequenceId, unitId).data` (`undefined` for a unit not in the
    sequence); `BookmarkButton`, exported from `courseware/course/bookmark`,
    takes a required `sequenceId` prop; `UnitTitleSlot`'s `unit` prop gains
    `sequenceId`, and its `pluginProps.unit` is the same object.

**Negative check, run:** with `useUnit`'s `enabled: false` flipped to `true`,
exactly two cases fail — the hook's *fetches nothing on its own* and #2123's
*requests the sequence metadata once per load* (the six readers refetching
on mount, 1 request becoming 2); the sequence and navigation suites still
pass. Full suite on this layer: 116 suites, 1183 tests.

11. **`Unit` guards its own read: `if (!unit) { return null; }` after the
    hooks.** Under `SequenceContent` the unit is always there — its `!unit`
    branch renders the no-content message instead of `Unit` — but `useUnit`
    cannot promise that to TypeScript, and `Unit` hands the whole unit to
    `UnitTitleSlot`. Three shapes were weighed in review: a non-null
    assertion (`useUnit(...).data!`, what the rebase onto #2126 first
    produced — correct at runtime, invisible in review, and enforcing nothing
    if `Unit` is ever rendered elsewhere); passing the unit down from
    `SequenceContent` as a prop (rejected: `Unit` taking a `unit` prop reads
    oddly, and threading a value a reader can supply sets a prop-drilling
    pattern); and the guard (chosen: a cheap restatement of the parent's
    check that makes `Unit` correct on its own). The `null` render is a state
    production does not reach.

</details>

## Manual testing

<details>
<summary>Checklist</summary>

# Manual testing — read units from the sequence query, not `useModel` (#2088, layer A)

In-browser verification against a live backend (tutor dev).

What changed: the six readers of the `units` model (`Sequence`,
`SequenceContent`, `Unit`, `UnitSuspense`, `useShouldDisplayHonorCode`,
`UnitButton`) read the unit through `useUnit(sequenceId, unitId)`, a disabled
`select` observer of the sequence query `CoursewareContainer` fetches; the
bookmark and completion writers patch the cached sequence with `setQueryData`
at its exact key instead of dispatching to the store; the sidebar's completion
check names the active sequence; the query no longer writes the `units`
model. No request-count change intended: `useUnit` never fetches.

**The bugs this layer could introduce.** (1) *A reader that never sees the
unit* — a disabled observer with nothing fetching its query stays `pending`
forever, so the unit title, bookmark button, completion ticks and the
honor-code / content-gating gates would never appear, with no error. Every
reader renders under `CoursewareContainer`, which fetches. (2) *A write that
lands nowhere* — a writer building a different key from the reader's
(preview flag, sequence id) patches nothing, so a bookmark click or a
completion check would leave the UI unchanged until the next sequence fetch.
(3) *Stale reads after a write* — if the cache write did not produce a new
object, observers would not re-render (the #2086 entry-11 concern). (4)
*`undefined` where `{}` was* — a unit id that is not in the sequence now
renders the no-content message (decision 3), and an operator's `UnitTitleSlot`
widget reading `unit.…` sees the same object as before, now with
`sequenceId`. (5) *The cross-sequence completion request* — the sidebar's
`get_completion` POST now goes to the active unit's sequence handler.

## Setup

A course with two or more sequences of several units, with completion
tracking on. A graded unit in a course with the honor code / integrity
signature enabled, if available. A unit with content-type-gated content, if
available. Preview mode available (staff). Devtools Network filtered to
`courseware/sequence|get_completion|bookmarks`, Console open.

## Checks

### Request count (bug 1, and no new observers) — the #2098 protocol

- [ ] **Hard-reload a unit, wait for idle:** `api/courseware/sequence/{id}` **1** (unchanged from #2123).
- [ ] **Navigate to another unit in the same sequence:** no new `courseware/sequence` request.
- [ ] **Preview mode (staff):** open the same unit under `/preview/course/…`; one `courseware/sequence` request with `preview=1`; the unit title and bookmark button render.

### Bookmarks (bugs 2 and 3)

- [x] **Bookmark a unit:** the button flips to "Bookmarked" and disables while the POST is in flight, then enables; the bookmark icon appears on the unit's tab in the sequence navigation without a sequence refetch.
- [x] **Un-bookmark it:** the button flips back; the tab icon disappears.
- [ ] **Failure (devtools: block `api/bookmarks`):** click bookmark; the button reverts to un-bookmarked and the console logs the error.
- [x] **Preview mode:** bookmark a unit under `/preview/…`; the button and tab update (the write lands on the preview-keyed entry).

### Completion (bugs 2, 3 and 5)

- [ ] **Next-unit navigation:** on a unit, click next; the previous unit's tab shows the completion tick without a sequence refetch.
- [ ] **Sidebar, same sequence:** click another unit of the current sequence in the outline sidebar; the `get_completion` POST goes to `xblock/{current sequence}/handler/get_completion` with the unit you left; its tab shows the tick.
- [x] **Sidebar, cross-sequence:** from a unit in sequence A, click a unit in sequence B in the sidebar; the POST goes to **sequence A's** handler (was: sequence B's) with the unit you left; back in A, that unit shows the tick.
- [x] **Already complete:** revisit a completed unit and move on; no `get_completion` request.

### Gates (bug 1)

- [ ] **Honor code (if available):** a graded unit for a learner who has not signed shows the honor-code modal; after signing, it does not.
- [ ] **Content-type gating (if available):** a unit with gated content shows the gated-content message for an audit learner.

### The awakened guard (bug 4)

- [ ] **Unit not in the sequence:** open `/course/{id}/{sequenceId}/{unit id from another sequence}` for a sequence that has units: "There is no content here." renders, no iframe, no unit navigation. Baseline on the layer below (run 2026-09-25): the other sequence's unit rendered under this sequence, previous/next did not go to the right places, and the outline sidebar showed the sequence expanded with no unit highlighted.
- [ ] **Sequence with no units:** open `/course/{id}/{emptySequenceId}/{any unit id}`: the redirect strips the unit id and the page shows "There is no content here." with no navigation. Baseline on the layer below (run 2026-09-25): the same — the no-units redirect predates this layer.
- [ ] **Console:** no error naming `useUnit`, `updateSequenceUnit`, `useIsPreview` or `sequenceMetadataQuery`.

## Results

Run 2026-09-25 on tutor dev, a minimal pass of the write-path checks; the
rest skipped (see *Not run*). 5 of 16 checks run, all passing.

**Run**

- **Bookmark a unit, un-bookmark it:** the button flipped and disabled
  during the request, the tab icon appeared and disappeared.
- **Preview mode:** bookmarking under `/preview/…` updated the button and
  the tab (the write reached the preview-keyed entry).
- **Sidebar, cross-sequence:** one `get_completion` POST, to the sequence
  navigated *from*, for the unit navigated from. Baseline on the layer below,
  same click: one POST, to the sequence navigated *to* — the mis-keyed call
  decision 5 corrects.
- **Already complete:** revisiting a completed unit and moving on sent no
  `get_completion` request.

**Observed, outside this layer**

- **Next button:** a single click on the unit's next button sent **two**
  `get_completion` POSTs, both to the sequence navigated from, on this layer
  and on the layer below alike. That path is `Sequence` → `unitNavigationHandler`
  → `CoursewareContainer.handleUnitNavigationClick`, which this layer does
  not touch; the second request's initiator and payload were not captured.
  Pre-existing; not chased here.

**Not run**

- Request counts on reload and same-sequence navigation (unchanged from
  #2123; `useUnit` never fetches, pinned by *fetches nothing on its own*).
- Bookmark failure rollback (pinned by the two *reverts the flag* cases in
  the bookmark hook suite).
- Next-unit completion tick and sidebar same-sequence click (the same
  writer as the cross-sequence check, with no key mismatch to correct).
- Honor code and content-type gating (no such units in the test course;
  the `useShouldDisplayHonorCode` and `UnitSuspense` suites cover the gates
  against a mocked `useUnit`).
- The awakened-guard URLs (baselined by hand on the layer below earlier in
  the review — see the checklist lines — and pinned by *displays the
  no-content message for a unit that is not in the sequence* and *shows the
  no-content message for a sequence with no units*).
- Console check.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
