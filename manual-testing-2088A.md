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
