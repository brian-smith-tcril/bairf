**Clicking a unit in the course outline sidebar while on a sequence with no units throws `TypeError: Cannot read properties of undefined (reading 'unitIds')`.** The error is thrown in the link's click handler, so the error overlay shows before the navigation completes.

**Repro** (tutor local; seen on #2140's branch, where this code is unchanged from `master`):

1. Make a course with two sections: one with nothing in it, and one with a unit.
2. From the course outline, go into the first section. The page shows "There is no content here."
3. In the outline sidebar, click the unit in the other section.
4. The error shows before the navigation completes. Stack:
   - `logEvent` at `course-outline/hooks.js:82`
   - `handleUnitClick` at `hooks.js:94`
   - `onClick` at `UnitLinkWrapper.tsx:48`

**Cause, from the code:**
- On a sequence with no units the URL has no unit (`sequenceToSequenceUnitRedirect` only adds one when `sequence.unitIds.length > 0`). So the sidebar's `unitId` is `undefined`, and `CourseOutline.tsx` passes it on as `activeUnitId={unitId!}`.
- `handleUnitClick`'s `logEvent` (`sidebar/sidebars/course-outline/hooks.js`) looks up the active unit's sequence in the navigation outline:
  ```js
  const findSequenceByUnitId = () => Object.values(sequences).find(seq => seq.unitIds.includes(activeUnitId));
  const activeSequence = findSequenceByUnitId(activeUnitId);
  ...
  current_tab: activeSequence.unitIds.indexOf(activeUnitId) + 1,
  ```
  With `activeUnitId` undefined it finds nothing, and `activeSequence.unitIds` throws.

**Also in the same helper:** `findSequenceByUnitId` ignores its argument and always searches for `activeUnitId`. So `targetSequence = findSequenceByUnitId(id)` is the active unit's sequence, and the `edx.ui.lms.sequence.tab_selected` event's `target_tab` and `target_tab_count` are wrong whenever the click goes to a unit in another sequence.

Both date from #1586 (2025-02) and predate the React Query migration.

**Fix:**
- `findSequenceByUnitId` uses its argument.
- `logEvent` handles there being no active unit, or no matching sequence, without throwing. Whether the event is sent then without the `current_*` fields, or skipped, is to be decided.
- A test for each: a click from a sequence with no units, and the target fields for a click into another sequence.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
