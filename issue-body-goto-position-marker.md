Found during #2135's manual testing (PR #2146); present on `master` and in the class-era `CoursewareContainer` before any of the React Query work.

**Defect.** Crossing a sequence boundary with Next or Previous posts `goto_position` twice. The navigation links go to `/course/:courseId/:nextSequenceId/first` (or `/last`, since #1137), and `CoursewareContainer`'s position save runs whenever the route's unit segment changes. On that render the unit segment is the literal `first`, so `sequence.unitIds.indexOf('first')` is `-1` and the save posts `position: 0`, an index that does not exist (the handler is 1-indexed). The marker redirect then lands on the real unit and the save posts again, correctly.

Which sequence receives the bogus post has drifted with the refactors, but the post itself has always been there:
- Class component (before #2020): `componentDidUpdate` called `checkFetchSequence` and then `checkSaveSequencePosition` with `this.props` still holding the *previous* sequence as loaded, so the `position: 0` went to the sequence being left.
- Since the sequence became a query (#2061) and the save became an effect on the route's unit id (#2146): the post goes to the *new* sequence, and only when its metadata is already cached (a sequence visited earlier in the session); an uncached sequence is pending on that render, so nothing posts.

**Fix.** Save only for a unit the sequence actually holds: `sequence.unitIds.includes(routeUnitId)` in the effect's condition (`src/courseware/CoursewareContainer.tsx`), so a marker segment never saves.

**Tasks**
- A failing test first in `CoursewareContainer.test.jsx`: open a unit in sequence B, go Previous into sequence A, then Next back into B (B's metadata is cached by then), and assert the `goto_position` posts: one per landing, none with `position: 0`.
- The one-condition fix.

**Verify:** `npm run types`, `npm run lint` and the full suite green; on tutor local, Next across a sequence boundary into a sequence already opened this session posts `goto_position` once, with the landing unit's position.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
