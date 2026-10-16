## Summary

Convert the last two courseware write thunks to React Query mutations: `saveSequencePosition` (the optimistic sequence-position save) and `saveIntegritySignature` (the honor-code accept) become `useSaveSequencePosition` / `useSaveIntegritySignature` with the same optimistic, rollback, and masquerade semantics. This completes **Target 4 (remaining writers)** of the courseware decomposition ([plan](https://github.com/openedx/frontend-app-learning/issues/1946#issuecomment-5348891139)) in the Redux → React Query migration (#1946, Stage 1), stacked on the bookmarking conversion #2066. Closes #2015.

## What changed

- **`courseware/data/apiHooks.ts`: `useSaveSequencePosition`.** The thunk's `getState()` rollback pre-read becomes `onMutate` returning the old index as React Query context for `onError` to revert to; the optimistic write keeps its timing (`onMutate` runs synchronously before the POST), and the thunk's redundant confirm write on success is kept, comment and all — dropping it would change interleaving behavior under rapid unit switches. All writes are still `updateModel` dispatches, because the model store remains the merged source of truth for `sequences` until #1977 dissolves it.
- **`useSaveIntegritySignature`.** The masquerade skip becomes a resolve-without-request `mutationFn` branch, so `onSuccess` still clears `userNeedsIntegritySignature` with no backend POST — 1:1 with the thunk's `if (!isMasquerading)` guard ahead of its unconditional dispatch. On failure: `logError` only, no model write, the honor-code prompt stays.
- **Call sites.** `CoursewareContainer` swaps the dispatch for the hook callback inside the `guards.current` closure (safe to capture once — React Query's `mutate` is a stable reference), and `useDispatch` leaves the file entirely; `HonorCode` binds the hook to the same `saveIntegritySignature` name and keeps the masquerade predicate (`isMasquerading && username !== authUser.username`) in the component that owns the data it's computed from.
- **Deletions:** both thunks (`courseware/data/thunks.js` is down to `getCourseDiscussionTopics`, which #2016 owns), the `./thunks` export block in `courseware/data/index.js`, and `redux.test.js` (its three cases were exactly these two thunks; no orphaned coverage).
- **Tests:** the three `redux.test.js` cases port onto the `courseware/data/apiHooks.test.tsx` mutation pattern, plus three net-new cases: the 1-indexed `{ position: n + 1 }` wire body (the old test only asserted the URL), the optimistic write landing *before* the request resolves (hanging mock), and the integrity-signature failure path, which had no coverage at all. `HonorCode.test.jsx` needed no changes.

## Testing

`npm run types` (0 errors), `npm run lint` (clean), full jest suite green at head (111 suites, 1116 passed / 3 pre-existing skips). Manual pass on tutor local in the details block below; the revert-on-error item and the honor-code half rest on their unit tests (mapped in the manual-testing results).

## Decisions

<details>
<summary>Full decision log</summary>

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

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — saveIntegritySignature + saveSequencePosition → React Query (#2015)

In-browser verification for the remaining-writers layer, run against a live
backend (tutor local). This layer claims **zero user-facing change**: the two
thunks become `useSaveSequencePosition` (same optimistic `activeUnitIndex`
write, same revert-on-error via `onMutate` context, same redundant confirm
write on success) and `useSaveIntegritySignature` (same masquerade skip, same
no-write-on-failure), and every reader keeps reading the models. The things to
watch are the old semantics: the position save firing on unit navigation, the
resume-at-position behavior it feeds, and the honor-code prompt dismissing.

## Getting real IDs (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; base
`http://apps.local.openedx.io:2000/learning`.

- **Position saves need a sequence with `save_position` set.** Check a
  sequence's metadata response (DevTools → Network →
  `/api/courseware/sequence/{sequenceId}`) for `"save_position": true` — the
  Demo Course's "Homework - Question Styles" sequence reports `false` (per the
  pact fixture), so find or author a subsection that saves (timed/proctored
  exam subsections do). The save shows as a POST to
  `…/xblock/{sequenceId}/handler/goto_position` with a 1-indexed
  `{ "position": n }` body, fired when the route unit changes.
- **The honor-code prompt needs `user_needs_integrity_signature: true`** on
  the courseware-metadata response, i.e. the integrity-signature feature
  enabled on the LMS and a course requiring it; the prompt renders on graded
  units. The accept shows as a POST to
  `/api/agreements/v1/integrity_signature/{courseId}`.

## Verify by hand

Sequence position (in a `save_position: true` sequence):

- [x] **Save fires on unit navigation** — click through units: each route-unit
      change POSTs `goto_position` with the 1-indexed position of the new unit;
      no console errors.
- [x] **Position persists** — leave the sequence, then open the bare sequence
      URL (`/course/{courseId}/{sequenceId}`): it redirects to the last-active
      unit (the redirect reads `sequences.activeUnitIndex`, refreshed by the
      metadata fetch — server truth after the successful POST).
- [ ] **Revert on error** — DevTools → Network → Offline, navigate to another
      unit: the POST fails, a `logError` appears in the console, and the model
      position reverts (observable: the bare sequence URL redirects to the unit
      at the *old* position, not the one navigated to while offline). Back
      online: saving works again.

Honor code (env permitting — see above; if no local course qualifies, the
automated coverage below carries this half):

- [ ] **Agree dismisses and records** — on a graded unit showing the prompt,
      "I agree" POSTs to `integrity_signature` and the prompt clears (unit
      content renders).
- [ ] **Cancel navigates** — "Cancel" goes to `/course/{courseId}/home`.
- [ ] **Masquerade as a specific learner** — staff masquerading as a specific
      username: "I agree" dismisses the prompt with **no** POST.
- [ ] **No dismissal on failure** — Offline, "I agree": the POST fails, a
      `logError` appears, and the prompt stays.

## Left to the automated suite (not re-done by hand)

- The three ported `redux.test.js` cases (position success + network-error
  revert, signature success) — `courseware/data/apiHooks.test.tsx`.
- The new cases there: the 1-indexed `{ position: n + 1 }` body, the
  mid-flight optimistic write (hanging mock), the hook-level masquerade skip,
  and the signature failure path (`logError`, flag stays `true`).
- `HonorCode.test.jsx` — the component-level masquerade predicate
  (`isMasquerading && username !== authUser.username`) across its four cases,
  unchanged assertions.

## Results

Env: tutor local, run against the local branch @ `310b4517` (before any PR).

The two checked position items passed as described (save fires on unit
navigation with the 1-indexed body; the bare sequence URL resumes at the
last-active unit). The remaining items were not run by hand:

- **Revert on error** rests on the automated suite — the network-error case in
  `apiHooks.test.tsx` pins the `logError` + revert to the pre-mutation index,
  and the hanging-mock case pins the optimistic write it reverts from.
- **The honor-code half** (no qualifying local course) rests on the hook-level
  success / masquerade-skip / failure cases in `apiHooks.test.tsx` and the four
  `HonorCode.test.jsx` component cases (POST on agree, POST when generally
  masquerading, no POST when masquerading a specific student, cancel
  navigation).

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
