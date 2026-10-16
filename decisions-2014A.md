# Decisions — Layer A: de-class UnitButton (#2014)

1. **This issue ships as two stack layers; this is the structural peel.** The two
   jobs in #2014 are orthogonal — the bookmark mutation writes the units model,
   which `UnitButton` reads identically through `connect` or `useModel` — so the
   de-class goes first as its own PR (the #2008/#2012 "peel: structural, no
   data-layer change" convention) and the bookmark conversion follows as a pure
   data-layer layer that closes the issue. The riskiest part of the issue
   (preserving connect's merge semantics) gets its own small, focused review.

2. **`useModel`, not `useParams`, and the `useSelector` line stays.** The issue
   body described the connect as covering `state.models.units[unitId]` **+**
   `state.courseware.{courseId,sequenceId}` and suggested `useModel` /
   `useParams` reads. The `state.courseware` read is not part of the connect —
   it was already a plain `useSelector` in the function body, identical to the
   one in `SequenceNavigation.jsx` that this issue doesn't touch. Both are
   bridge-written courseware-slice fields owned by the #1976 teardown, so this
   layer replaces only the actual `connect` (the units-model spread) and leaves
   the `useSelector` line untouched.

3. **Merge direction preserved: model values over passed props.** Connect's
   default merge is `{ ...ownProps, ...stateProps }`, so the model entry wins
   whenever it exists. The rewrite destructures the model entry with prop
   fallbacks (`title = fallbackTitle`, `contentType = fallbackContentType`).
   `useModel` returns `{}` for a missing entry, so the fallbacks engage exactly
   where the connect spread of a missing entry did — the one caller relying on
   that is the gated branch (`SequenceNavigation.jsx`: `title=""`,
   `contentType="lock"` for a unit with no model entry). Model entries always
   define `title`/`contentType` (`page_title`/`type` in
   `normalizeSequenceMetadata`), so default-on-undefined is equivalent to the
   spread for every real payload.

4. **The file converts to TypeScript, and propTypes go entirely.** With the
   `connect` wrapper gone the component's contract is worth stating precisely,
   and TS does that better than propTypes: a `Props` interface (`onClick`/`unitId`
   required; `title`/`contentType`/`isActive`/`showCompletion`/`showTitle`/
   `className` optional) replaces `propTypes`/`defaultProps`, with the old
   defaults becoming destructure defaults (`isActive = false`,
   `showTitle = false`, `showCompletion = true`). New/reworked files are TS per
   the project direction; the `useSelector` gets the #2019 typing pattern
   (`(state: RootState) => state.courseware`).

5. **`bookmarked`/`complete` leave the prop contract.** They were connect-injected
   only — no caller passes them — so they exist solely as destructure defaults
   off the model entry (`bookmarked = false`, `complete = false`, matching the
   old `defaultProps`). `title`/`contentType` stay as optional props for the
   gated-branch fallback (before, connect injected them ahead of the propTypes
   check, so their `isRequired` never actually fired for the callers that pass
   neither).

6. **No behavior changes.** Renders byte-identically for every caller, gated
   branch included; all six sequence-navigation suites pass with no edits to any
   existing assertion.

7. **Two coverage cases added after codecov's patch check** (the rename makes
   the whole file "new patch", and the repo's codecov has zero patch tolerance —
   its 4 "missing lines" were the destructure-default branches, which had zero
   hits suite-wide). Both pin previously-untested pre-existing behavior:
   - *No-model-entry fallback* (the gated shape: `title=""`,
     `contentType="lock"`, absent `units` entry → lock icon, nothing
     model-sourced rendered). This was genuinely uncovered everywhere: the
     existing `SequenceNavigation` "renders locked button for gated content"
     test seeds the units into the store, so the model entry overrides the lock
     props — its own TODO comment admits it asserts `fa-tasks` instead of a
     lock. The new case is the first to exercise the fallback direction of the
     connect-merge semantics this peel preserves.
   - */preview link prefix* (the `pathname.startsWith('/preview')` ternary's
     true branch, previously never taken): rendered inside a `MemoryRouter` at a
     `/preview/course/…` entry, asserting the link href keeps the prefix.
   With these, `UnitButton.tsx` is at 100% statement/branch/function/line
   coverage.
