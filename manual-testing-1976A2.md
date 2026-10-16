# Manual testing — sequence readers onto the sequence query (#1976, layer A2)

In-browser verification for layer A2, against tutor local
(`http://apps.local.openedx.io:2000/learning`, DemoX
`course-v1:OpenedX+DemoX+DemoCourse`). This layer claims **zero user-facing
change**: `Sequence`, the sequence-alerts hooks, and `SequenceNavigation`
derive the sequence status from the sequence metadata query instead of the
Redux mirror. The things to watch are the loading/failed gates and the
sequence-navigation next-button states (its course-exit lookup was hoisted
for the Rules-of-Hooks fix).

## Verify by hand

- [x] **Unit page loads** (`Sequence`'s status gate) — open a unit: brief
  sequence spinner, then content; navigate between sequences via the outline
  tray (each shows spinner → content, no error page, no console errors).
- [x] **Unit-id-as-sequence URL** (`sequenceMightBeUnit` keeps the spinner
  while the container redirects) — paste a unit id into the sequence slot of
  the URL (`/course/{courseId}/{unitId}`): spinner (no error flash), then the
  redirect lands on the proper `/course/{courseId}/{sequenceId}/{unitId}`.
- [x] **Sequence navigation bar** (SequenceNavigation converted + hoisted
  course-exit lookup) — with the default nav re-injected via `env.config.jsx`
  (slot `org.openedx.frontend.learning.sequence_navigation.v1`, per its
  README): tabs render after load, prev/next work, and on the **last unit of
  the course** the Next button shows its end-of-course state (disabled, or
  "Next (end of course)" / "Complete the course" per cert state).
- [ ] **Banner text alert** (sequence-alerts hooks) — open a sequence with a
  `bannerText` (staff-authored notice); the info alert renders above the
  unit. If no local sequence has one, note it and lean on the alerts suite.
- [x] **Preview route** (`isPreview` from the pathname keys the same query) —
  open a unit under `/preview/course/...` as staff: loads normally, Network
  tab shows the sequence metadata GET with `preview=1`.

## Results

Env: tutor local (DemoX), 2026-09-16, run against the local branch @ `f8db3d73`
(before any push), sequence-navigation check with the default nav re-injected
via `env.config.jsx`.

Four of five passed as described: unit pages load through the query gate
(spinner → content, no console errors), the unit-id-as-sequence URL shows the
spinner and redirects to the proper unit path (the `sequenceMightBeUnit`
path), the sequence navigation bar renders with working prev/next and the
correct last-unit Next state, and the preview route loads with `preview=1` on
the sequence metadata GET.

The **banner text alert** was not run by hand — no local sequence carries a
`bannerText` — and rests on the alerts suite, which pins the converted gate
(`sequenceQuery.isSuccess && sequence.bannerText`) at the hook level.
