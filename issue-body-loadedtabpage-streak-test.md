Part of #1946 — Redux → React Query migration (Stage 1). Not a conversion: a test-hygiene fix, filed here because B2 (#2085) rewrites how `LoadedTabPage.test.jsx` gets its data, and the suite's streak case should assert something before that layer changes the source.

**What's wrong.** *shows streak celebration modal* in `src/tab-page/LoadedTabPage.test.jsx` cannot fail, for two independent reasons:

- **The mock renders unconditionally.** The suite replaces `StreakCelebrationModal` with a component that returns `<div data-testid="StreakModal" />` whatever its props, and `LoadedTabPage` always renders `StreakModal` (`LoadedTabPage.tsx:71-77`), open or closed. The assertion — the mock is in the document — is true on every render of `LoadedTabPage`.
- **The fixture never reaches the component.** The case builds the *courseware* metadata factory with `celebrations: { streakLengthToCelebrate: 3 }`. `LoadedTabPage` reads `celebrations` from `courseHomeMeta`, which `initializeTestStore` fills from the separate `courseHomeMetadata` factory, built with `celebrations: null` (`buildSimpleCourseAndSequenceMetadata`, `sequenceMetadata.factory.js`). `streakLengthToCelebrate` is `null` in the component for the whole test.

Deleting the `celebrations` attribute from the fixture leaves the test green.

**Provenance.** The mock has been unconditional since the case was written (2525805a, #354, 2021-02-22). The fixture stopped reaching the component in 3fe5bb17 (AA-1018, 2022-01-14), which moved `LoadedTabPage`'s read from the courseware model to `courseHomeMeta` and gave the test store its own `courseHomeMetadata` factory; the case was not updated. b3d33667 (#962, 2023) only reformatted the mock for a lint rule.

**Precedent.** #2078 (PR #2079) and #2100 (PR #2101) each fixed tests that could not fail as their own `test:` layer, below the layer that would otherwise have had to touch them, so that layer stayed about its own change.

**Tasks**
- Build the fixture on the factory the component reads: `Factory.build('courseHomeMetadata', { celebrations: { streak_length_to_celebrate: 3 } })`, passed as `initializeTestStore`'s `courseHomeMetadata` option (the shape the suite's staff case already uses).
- Make the mock record what it is given — a `jest.fn()` component the `jest.mock` factory delegates to — and assert on the props `LoadedTabPage` derives from `celebrations`: `isStreakCelebrationOpen: true` and `streakLengthToCelebrate: 3`.
- Add the contrast in *renders correctly* (default fixture, `celebrations: null`): the modal is rendered closed, `isStreakCelebrationOpen: false`. Without it the new assertion could be satisfied by a mock that is always called open.
- Test-only; `LoadedTabPage.tsx` is not touched.

**Verify:** the suite is green; removing `celebrations` from the streak fixture makes the streak case fail, and swapping `!!isStreakCelebrationOpen` for `true` on the `StreakModal` prop makes the contrast fail.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
