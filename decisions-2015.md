# Decisions — saveIntegritySignature + saveSequencePosition → React Query (#2015)

1. **One layer, not two.** Unlike the #2014 peel+convert split, both tasks here
   are the same kind of change in the same files — `courseware/data/apiHooks.ts`
   gains two mutations, and `courseware/data/thunks.js` / `redux.test.js`
   shrink and die together — so there was nothing to peel and no review benefit
   to splitting. One PR closes the issue.

2. **The hooks live in `courseware/data/apiHooks.ts`.** These are
   `courseware/data` thunks with no feature subdirectory of their own (unlike
   bookmarks), so the mutations sit alongside `useCheckBlockCompletion` —
   which also set the shape both hooks follow: callback return (not the
   mutation object), no mutation keys, explicit `logError` in `onError`
   (the global `QueryCache.onError` from #2022 covers queries only).

3. **The model store stays the write target — no `setQueryData`.** Every
   reader of the written state is a model read (`sequences.activeUnitIndex`
   via `CoursewareContainer`'s selectors and `useIFrameBehavior`;
   `coursewareMeta.userNeedsIntegritySignature` via
   `useShouldDisplayHonorCode`'s `useModel`), and the model store remains the
   merged source of truth until #1977. Durability matches the #2014 analysis:
   the bridge rewrites models only on a real fetch `onSuccess`, and a real
   refetch carries server truth including the saved position / signature.
   One pre-existing caveat, unchanged by the port: after a masqueraded
   dismissal the server still reports the signature as needed, so a metadata
   refetch can resurrect the honor-code prompt — the thunk behaved
   identically (a re-fetch overwrote the Redux state the same way); the
   dismissal was always session-scoped. Query-cache patching is deferred to
   #1977.

4. **The thunk's `getState()` rollback pre-read became `onMutate` context.**
   `onMutate` reads the current `activeUnitIndex` (via `useStore`, per the
   `useCheckBlockCompletion` guard precedent), writes the optimistic value —
   synchronously before the POST, same timing as the thunk's first dispatch —
   and returns the old index as React Query context for `onError` to revert
   to. That's the RQ-native home for rollback state and keeps the returned
   callback's signature identical to the thunk's. An alternative (pre-reading
   in the returned callback and passing the old index through the mutation
   variables) was rejected: it would widen the variables type with state the
   caller never supplies.

5. **The redundant success re-write is kept, comment and all.**
   `saveSequencePosition` re-dispatched the same value after the POST settled
   ("update again under the assumption that the above call succeeded, since
   it doesn't return a meaningful response"). Dropping it would change
   interleaving behavior under rapid unit switches, so the faithful port
   keeps it in `onSuccess`.

6. **The masquerade skip is a resolve-without-request `mutationFn` branch.**
   When masquerading as a specific learner, `mutationFn` resolves `null`
   without posting, so `onSuccess` still clears
   `userNeedsIntegritySignature` — mapping 1:1 onto the thunk's
   `if (!isMasquerading)` guard ahead of its unconditional dispatch. The
   masquerade predicate (`isMasquerading && username !== authUser.username`)
   stays in `HonorCode`, which owns the data it's computed from. On failure:
   `logError` only, no model write, the prompt stays (the thunk's catch path).

7. **Non-null assertions over widened types.** `SaveSequencePositionVars`
   keeps `courseId`/`sequenceId` nullable with the same #1976 comment as
   `CheckBlockCompletionVars` (the call site reads the still-untyped Redux
   slice via `latest.current`), so the `onMutate` pre-read indexes with
   `sequenceId!` and the `onError` rollback uses `context!` — both truthful
   (the guard only fires with a loaded sequence; context always exists when
   `onMutate` is defined), following the file's existing `courseId!` pattern.

8. **`useDispatch` leaves `CoursewareContainer` entirely** —
   `saveSequencePosition` was its last use. Capturing the hook's callback in
   the once-created `guards.current` closure is safe: React Query's `mutate`
   is a stable reference and `store` is stable, so the `useCallback` result
   never goes stale.

9. **`redux.test.js` deleted, not trimmed** — its three cases were exactly
   these two thunks. They ported to `apiHooks.test.tsx` on the existing
   mutation pattern, plus three new cases: the 1-indexed
   `{ position: index + 1 }` wire body (the old test only asserted the URL),
   a mid-flight optimistic write (hanging mock), and the integrity-signature
   failure path, which had no coverage at all. The integrity tests seed the
   normalized `coursewareMeta` model directly with `addModel` instead of
   round-tripping through `getCourseMetadata` like the old test — the
   `user_needs_integrity_signature` normalization is covered by the metadata
   query tests and the pact suite. `HonorCode.test.jsx` (component-level
   masquerade coverage) and the pact tests (raw api functions) needed no
   changes.
