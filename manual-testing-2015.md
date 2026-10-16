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
