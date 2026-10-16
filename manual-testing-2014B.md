# Manual testing — Layer B: bookmarking → React Query (#2014)

In-browser verification for the bookmark-conversion layer, run against a live
backend (tutor local). This layer claims **zero user-facing change**: the
`addBookmark`/`removeBookmark` thunks become one `useToggleBookmark` mutation
with the same optimistic model writes (`loading` flip → `loaded` confirm, or
`failed` revert + `logError`), and every reader keeps reading the `units` model.
The things to watch are exactly the old semantics: the optimistic flip, the
disabled-while-processing button, and the revert on error.

## Getting real IDs (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; base
`http://apps.local.openedx.io:2000/learning`. Any unit page has the
"Bookmark this page" button under the unit title. The requests show in
DevTools → Network filtered on `bookmarks` (POST to
`/api/bookmarks/v1/bookmarks/` on add; DELETE to
`…/bookmarks/{username},{unitId}/` on remove).

## Verify by hand

- [x] **Add bookmark** — click "Bookmark this page": the button flips to
      "Bookmarked" (filled icon) immediately (optimistic, before the response),
      is disabled while the POST is in flight, and the POST body carries
      `{ "usage_id": "<unitId>" }`.
- [x] **Bookmark dot reaches the sequence nav** — after adding, the unit's
      sequence-nav button shows the bookmark dot (and in the narrow-viewport
      dropdown) without any refetch.
- [x] **Remove bookmark** — click "Bookmarked": flips back to "Bookmark this
      page" optimistically; the DELETE URL contains `{username},{unitId}`.
- [x] **State survives a reload** — hard-reload the unit page: the bookmark
      state matches the server (comes from the sequence-metadata fetch, not the
      mutation).
- [ ] **Revert on error** — DevTools → Network → Offline, then toggle: the flag
      flips optimistically, the request fails, the flag flips back
      (revert), the button re-enables, and a page-action `logError` appears in
      the console. Back online: toggling works again.
- [ ] **Rapid-toggle guard unchanged** — while a toggle is in flight the button
      is disabled (`isProcessing` from `bookmarkedUpdateState === 'loading'`),
      so no second request fires.

## Left to the automated suite (not re-done by hand)

- The four ported thunk cases (add/remove × success/network-error: model writes,
  request shapes, `logError` + revert on failure) — `bookmark/data/apiHooks.test.tsx`.
- The new optimistic-semantics case: `bookmarkedUpdateState === 'loading'` lands
  *before* the request resolves (hanging mock) — `apiHooks.test.tsx`.
- `BookmarkButton.test.jsx` — button states and store writes through the real
  render path, unchanged assertions.

## Results

Env: tutor local, `course-v1:OpenedX+DemoX+DemoCourse`, run against the local
branch @ `ba0c136b` (before any PR).

The four checked items passed as described; nothing surprising observed. The
revert-on-error and rapid-toggle-guard items were not run by hand; both rest on
the automated suite — the two network-error cases in `apiHooks.test.tsx` pin the
`logError` + revert writes, its hanging-mock case pins the mid-flight `loading`
state that drives the disabled button, and `BookmarkButton.test.jsx`'s
"does not handle adding bookmark when processing" case pins that a disabled
button fires no request.
