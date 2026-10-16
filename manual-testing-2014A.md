# Manual testing — Layer A: de-class UnitButton (#2014)

In-browser verification for the peel layer, run against a live backend (tutor
local). This layer claims **zero user-facing change**: `UnitButton` drops its
`connect` wrapper and reads the same `units` model entry through
`useModel('units', unitId)` instead — same state, same merge direction (model
values over passed props), same rendering for every caller. No network behavior
changes at all (the component fetches nothing).

The one code path with any subtlety is the **gated-sequence fallback**: the lock
button (`SequenceNavigation`'s `isLocked` branch) passes `title=""` /
`contentType="lock"` for a unit with no model entry, relying on the prop-fallback
direction the de-class must preserve.

## Getting real IDs (DemoX on tutor local)

Course id: `course-v1:OpenedX+DemoX+DemoCourse`; base
`http://apps.local.openedx.io:2000/learning`. Any unit page shows the sequence
nav. For the completion check and bookmark dot, use a sequence containing at
least one completed unit and one bookmarked unit (bookmark one via the
"Bookmark this page" button first if needed). The dropdown variant needs a
narrow viewport (below the `small` breakpoint) or a sequence with enough units
to overflow.

## Verify by hand

- [x] **Desktop sequence nav renders identically** — open a unit page: one button
      per unit with the right content-type icon, active unit highlighted,
      completed units show the check, the bookmarked unit shows the bookmark dot
      (top-right of its button).
- [x] **Clicking a unit button navigates** — URL changes to
      `/course/{courseId}/{sequenceId}/{unitId}`, unit content loads.
- [x] **Overflow dropdown shows titles** — the dropdown appears when the unit
      buttons overflow their container (`useIndexOfLastVisibleChild`), not at a
      viewport breakpoint: use a sequence with enough units and a narrow window
      (~375px device toolbar; an open outline sidebar narrows the container
      too). The "{n} of {m}" dropdown lists unit titles (the `showTitle` path,
      titles come from the model), completion/bookmark markers intact,
      selection navigates.
- [ ] **Gated sequence renders the lock button** — needs a prereq-gated course
      (not DemoX; rely on the existing `SequenceNavigation` suite if none is
      handy): the locked sequence shows the single lock-icon button (the
      prop-fallback path — no model entry for the unit).
- [x] **Staff preview links stay on `/preview`** — in a unit page under
      `/preview/course/…`, unit-button links keep the `/preview` prefix.

## Left to the automated suite (not re-done by hand)

- All seven `UnitButton.test.jsx` cases (title hidden/shown, completion
  shown/hidden, bookmark dot, click handler) — unchanged assertions, now
  exercising the `useModel` read.
- The `SequenceNavigation*` suites (including the locked-sequence rendering)
  render `UnitButton` through the seeded store — unchanged.

## Results

Env: tutor local, `course-v1:OpenedX+DemoX+DemoCourse`, run against the local
branch @ `1d801b20` (before any PR).

The four checked items passed as described; nothing surprising observed. The
overflow dropdown needed the real trigger — button overflow of the tabs
container, not a viewport breakpoint — so the checklist item was corrected
mid-pass. The gated-sequence item was not run by hand (no prereq-gated course
locally); it rests on the `SequenceNavigation` suite's locked-sequence
rendering case, which passes. Setup note: a local `env.config.jsx` had to be
added for the app to render at all — the file is untracked in this repo (known
local-dev quirk, unrelated to this branch's change).
