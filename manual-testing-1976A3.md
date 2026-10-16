# Manual testing — useIsCourseLoaded + useSequenceIds (#1976, layer A3)

In-browser verification for layer A3, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX
`course-v1:OpenedX+DemoX+DemoCourse`). This layer claims **zero user-facing
change**: `useSequenceNavigationMetadata` and `UnitNavigationEffortEstimate`
derive the course-loaded gate and the ordered sequence-id list from queries
instead of the Redux mirrors. The things to watch are unit navigation's
cross-sequence links and first/last-unit states — everything that depends on
the sequence ordering and the loaded gate.

## Verify by hand

- [x] **Cross-sequence unit navigation** (`useSequenceIds` ordering) — on the
  last unit of a sequence that has a following sequence, Next links to the
  next sequence's `/first`; on the first unit of a non-first sequence,
  Previous links to the previous sequence's `/last`; both navigate correctly.
  (Bottom unit navigation is always rendered; no `env.config.jsx` needed.)
- [x] **First/last-unit states** (`isFirstUnit`/`isLastUnit` off the loaded
  gate) — first unit of the course: Previous disabled; last unit of the
  course: Next shows its end-of-course state (disabled, or the
  end-of-course/complete-course link per cert state).
- [x] **Mid-sequence navigation** — prev/next between units within a sequence
  keeps working; no flash of wrongly-disabled buttons after load settles.

## Results

All three checks passed (2026-09-16, tutor local, DemoX, run against the local
branch @ `05011cba`, before any push): cross-sequence Next/Previous land on
the following sequence's `/first` and the preceding sequence's `/last`, the
course's first unit disables Previous and its last unit shows the correct
end-of-course Next state, and mid-sequence prev/next work with no flash of
wrongly-disabled buttons after load.
