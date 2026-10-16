# Decisions — Layer B: bookmarking → React Query (#2014)

1. **The mutation writes the model store, not a query cache.** The issue said
   "optimistically patching `bookmarked`/`bookmarkedUpdateState` on the `units`
   cache" — but every reader (`Unit` → `UnitTitleSlot`, and `UnitButton` via
   `useModel` since the peel below) reads the **model store**, which stays the
   merged source of truth for `units` until #1977. So the mutation dispatches
   `updateModel`, exactly what `useCheckBlockCompletion`'s `onSuccess` does for
   `complete` — no `setQueryData` on the sequence query. Durability: the model
   bridge (`bridgeToModelStore`) runs only on a real fetch `onSuccess`, never on
   cache-hit remounts, and a real refetch carries server truth *including* the
   new bookmark state — so an optimistic write can't be reverted by stale cached
   data. Patching the sequence query cache becomes necessary only when #1977
   moves the readers onto query data; noted for that issue.

2. **One mutation, not two.** `addBookmark`/`removeBookmark` were byte-for-byte
   mirror images differing only in the target boolean and the api call, and
   `BookmarkButton` already computed the direction for its conditional dispatch.
   `useSetBookmarked` puts the direction in the mutation variables; a
   thunk-mirroring `useAddBookmark`/`useRemoveBookmark` pair was rejected as
   pure duplication.

3. **Naming: `useSetBookmarked`, and the toggle lives in the component.** The
   hook doesn't read the current state — the caller supplies the target value —
   so "toggle" would promise semantics its signature doesn't deliver; it *sets*
   `bookmarked` to X. The component's named handler `toggleBookmark`
   (`() => setBookmarked(unitId, !isBookmarked)`) is where toggle semantics
   genuinely exist, and it keeps the `onClick={toggleBookmark}` JSX line
   byte-identical to master. A first-pass `useToggleBookmark` name (and an
   inline-arrow handler, then a `mutateBookmark` binding) were rejected in
   review in favor of this split.

4. **`onMutate`/`onSuccess`/`onError` map 1:1 onto the thunks' dispatches** —
   optimistic `loading` flip, `loaded` confirm, `failed` revert + `logError`.
   Same values, same order. The explicit `onError: logError` follows the
   `useCheckBlockCompletion` precedent: the global `QueryCache.onError` (#2022)
   covers queries only, not mutations.

5. **The hook returns a callback, not the mutation object** (the
   `useCheckBlockCompletion` shape). No component needs `isPending`:
   `isProcessing` keeps deriving from `bookmarkedUpdateState === 'loading'` in
   `UnitTitleSlot`, preserving the prop contract of the
   `org.openedx.frontend.learning.unit_title.v1` plugin slot.

6. **`BookmarkButton`'s `useCallback` (and its `eslint-disable
   react-hooks/exhaustive-deps`) is gone.** The handler's only changing input is
   `isBookmarked`, so memoization buys nothing (`StatefulButton` isn't
   memoized); `toggleBookmark` is a plain named function and no disable comment
   survives the rewrite (per the no-`eslint-disable` convention).

7. **Tests.** The four `redux.test.js` cases port assertion-for-assertion onto
   the `courseware/data/apiHooks.test.tsx` mutation pattern (same URLs, same
   `objectContaining` model checks, same `logError` expectations), plus one new
   case the thunk shape couldn't express cleanly: the optimistic `loading`
   write lands *before* the request resolves (hanging mock). `BookmarkButton.test.jsx`
   needed no changes — it renders through the real provider stack and keeps its
   axios mocks (the mutation calls the same `api.js` functions).

   Where each deleted `redux.test.js` case went (all in
   `bookmark/data/apiHooks.test.tsx`; the driver changed from
   `executeThunk(thunks.…)` to `renderHook` + `act` + `waitFor`, the predicates
   did not):

   | Deleted case | What it pinned | Now covered by |
   |---|---|---|
   | `addBookmark` › "Should create bookmark and update model state" | units model → `{ bookmarked: true, bookmarkedUpdateState: 'loaded' }` | "creates the bookmark and updates the model state" — same model check, **plus** the POST url and `{ usage_id }` body (body was previously pinned only in `BookmarkButton.test.jsx`, where it still is) |
   | `addBookmark` › "Should fail to create bookmark in case of error" | `logError` called; POST url; model reverted → `{ bookmarked: false, … 'failed' }` | "logs the error and reverts the flag when creating the bookmark fails" — same three assertions |
   | `removeBookmark` › "Should delete bookmark and update model state" | units model → `{ bookmarked: false, … 'loaded' }` | "deletes the bookmark and updates the model state" — same model check, **plus** the DELETE url (`{username},{unitId}`) |
   | `removeBookmark` › "Should fail to remove bookmark in case of error" | `logError` called; DELETE url; model reverted → `{ bookmarked: true, … 'failed' }` | "logs the error and reverts the flag when deleting the bookmark fails" — same three assertions |
   | — (no old counterpart) | — | "flips the flag optimistically before the request resolves" — new: `{ bookmarked: true, … 'loading' }` lands mid-flight, then `'loaded'` after the hanging mock resolves |

8. **No behavior changes intended** — same optimistic flip timing, same
   revert-on-error, same `logError`, same three model writes per toggle,
   fire-and-forget from the button either way.
