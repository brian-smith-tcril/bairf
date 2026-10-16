# Decisions — make the LoadedTabPage streak test actually assert (#2107)

Test-only layer between #2103 (PR #2106) and B2 (#2085). Entries 1 and 2 were
settled while reviewing the #2085 plan; the rest landed with the code.

1. **A layer of its own, below B2.** B2 rewrites how `LoadedTabPage.test.jsx`
   gets its data (the query instead of the store), so it would have had to
   touch this case anyway, and the first draft of the B2 plan fixed it there.
   Rejected in review for the #2078 / #2100 shape: a small issue and a tiny
   `test:` layer first, so B2's diff to the suite is only the data-source
   swap and the repair of a 2021 test is reviewed as what it is. It sits on
   #2103 because that is the stack top; nothing in it depends on #2103.

2. **Two defects, either of which alone keeps the case green.**
   - **The mock rendered unconditionally.** `StreakCelebrationModal` was
     mocked as a component returning `<div data-testid="StreakModal" />`
     whatever its props, and `LoadedTabPage` always renders `StreakModal`
     (`LoadedTabPage.tsx:71-77`), open or closed. "The mock is in the
     document" is true on every render. So since the case was written
     (2525805a, #354, 2021-02-22).
   - **The fixture never reached the component.** The case built the
     courseware metadata factory with `celebrations`, but `LoadedTabPage` has
     read `celebrations` from `courseHomeMeta` since 3fe5bb17 (AA-1018,
     2022-01-14), and `initializeTestStore` fills that model from a separate
     `courseHomeMetadata` factory built with `celebrations: null`
     (`buildSimpleCourseAndSequenceMetadata`, `sequenceMetadata.factory.js`).
     The case was not updated then. b3d33667 (#962, 2023) only reformatted
     the mock for a lint rule.

   Removing `celebrations` from the fixture left the case green, on this
   layer's base with no other change.

3. **The fixture goes on the `courseHomeMetadata` factory, through the
   `initializeTestStore` option.** `initializeTestStore({ courseHomeMetadata })`
   is the shape the suite's staff case already uses
   (`original_user_is_staff: true`), and the store fills `courseHomeMeta`
   from the mocked `course_metadata` endpoint through the real normalizer, so
   `streak_length_to_celebrate` arrives camel-cased exactly as production
   data does. The course id comes from `getTestStoreIds(testStore)` rather
   than a hand-built `courseMetadata`, since the case no longer builds one.

4. **The modal is not mocked; the case asserts on the dialog.** A first
   version kept a mock and made it a `jest.fn` component
   (`UnitSuspense.test.jsx:20-21`'s shape), asserting on the props
   `LoadedTabPage` passed it — `isStreakCelebrationOpen: true`,
   `streakLengthToCelebrate: 3`. Rejected in review: that tests that
   `LoadedTabPage` hands a stub an open flag, not that anything is shown,
   which is what the case is named for. The real `StreakCelebrationModal`
   returns `null` when closed (`StreakCelebrationModal.jsx:117-119`) and
   renders a Paragon `ModalDialog` titled
   `${streakLengthToCelebrate} day streak` when open (`:143-161`), so the
   case now asserts `getByRole('dialog')` has text `3 day streak`: both the
   open flag and the length flow through the real component to what a
   learner sees. Rendering it costs what its own suite pays
   (`StreakCelebrationModal.test.jsx:18-19,56`): `jest.mock('@edx/frontend-platform/analytics')`,
   because opening fires `recordStreakCelebration` → `sendTrackEvent`, and an
   `act` wrapper around the render for the modal's effects. Its own
   `useModel('courseHomeMeta')` read (`org`, `username`) is served by the
   same store the fixture fills; its discount effect is skipped because
   `streakDiscountCouponEnabled` is `null` on the default fixture.

5. **`renders correctly` asserts the contrast.** On the default fixture
   (`celebrations: null`) there is no dialog on the page
   (`queryByRole('dialog')` is null). Without it the streak case's assertion
   could be satisfied by a modal that is always open — the mirror of
   defect 1. It also pins the `!!` coercion on the prop
   (`LoadedTabPage.tsx:75`): forcing the prop to `true` in the component
   renders a dialog titled "null day streak" and fails this case.

6. **Test-only, one file.** `LoadedTabPage.tsx` is untouched; the diff is
   `src/tab-page/LoadedTabPage.test.jsx` alone (10 insertions, 8 deletions).
   Suite 3/3 with no console output; `npm run lint` and `npm run types`
   clean. Negative checks on this layer: removing `celebrations` from the
   fixture fails *shows streak celebration modal* (no element with role
   `dialog`); replacing `!!isStreakCelebrationOpen` with a bare
   `isStreakCelebrationOpen` on the `StreakModal` prop fails *renders
   correctly*. The full suite was not run for a one-file test change.
