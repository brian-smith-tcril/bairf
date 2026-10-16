Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layer B3**. Depends on B1 (#2084) and B2 (#2085); finishes `courseHomeMeta`.

**Goal:** convert the remaining `courseHomeMeta` readers, move the two optimistic `celebrations` writes onto the query, and drop the `courseHomeMeta` bridge entry.

**Tasks** — 22 sites, each `useModel('courseHomeMeta', courseId)` → `useCourseHomeMeta(courseId, { enabled: false }).data ?? {}`:
- `courseware/course/` (16): `Course.jsx:34`, `celebration/CelebrationModal.jsx:24`, `celebration/WeeklyGoalCelebrationModal.jsx:18`, `course-exit/` (`CatalogSuggestion`, `CourseCelebration`, `CourseExit`, `CourseInProgress`, `CourseNonPassing`, `CourseRecommendations`, `UpgradeFootnote`, `utils.js:85`), `sequence/Sequence.jsx:45`, `sequence/hidden-after-due/HiddenAfterDue.jsx:13`, `sequence/honor-code/HonorCode.jsx:20`, `sequence/lock-paywall/LockPaywall.jsx:36`, `sidebar/SidebarContextProvider.jsx:33`.
- `courseware/social-share/SocialIcons.jsx:37`, `shared/streak-celebration/StreakCelebrationModal.jsx:61`, `widgets/upgrade/src/UpgradePanel.jsx:45`, `product-tours/ProductTours.jsx:24`, `product-tours/newUserCourseHomeTour/LaunchCourseHomeTourButton.jsx:22`, `plugin-slots/CourseExitPluginSlots/DashboardFootnoteLinkPluginSlot/index.tsx:19`.
- Move the two optimistic `celebrations` writes — `courseware/course/celebration/utils.jsx` and `shared/streak-celebration/utils.jsx`, both `dispatch(updateModel({ modelType: 'courseHomeMeta', … }))` — to `queryClient.setQueryData`. `useDispatch` then leaves `Course.jsx`, `CelebrationModal.jsx` and `StreakCelebrationModal.jsx`.
- Remove `meta: { modelType: 'courseHomeMeta', courseId }` from `useCourseHomeMeta`.

**Verify:** `git grep "useModel('courseHomeMeta'" src` is empty; the first-section and weekly-goal celebration modals still appear once and do not reappear on re-render; the streak modal still closes and records; `git grep courseHomeMeta src` finds no model-store writer.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **The two celebration writers are the reason this layer, not B2, drops the bridge entry.** Both mark a celebration as shown by writing back into the model (`recordFirstSectionCelebration`, `recordModalClosing`), threading `dispatch` in from their components. On the query they become a cache write against the metadata query, which is also what removes the last three `useDispatch` calls outside `courseware/data`. A `setQueryData` write re-renders disabled observers too, so the `{ enabled: false }` readers still see the celebration marked as shown.
- **`{ enabled: false }` at every site (updated after #2098).** Every site renders under a component that fetches the metadata query: a course-home tab wrapper or `CoursewareContainer` for `TabPage` / `LoadedTabPage` and what they render (`ProductTours`, the streak modal, `LaunchCourseHomeTourButton`), `CoursewareContainer` for the rest of the courseware subtree (including sidebar widgets such as `UpgradePanel`), and `CourseExit` for the course-end route (including `DashboardFootnoteLinkPluginSlot`). As fetching observers they would refetch on mount, the defect #2098 fixed for the courseware gate.
- **`CourseExit.jsx` already fetches the query** — `useCourseHomeMeta(courseId)` at `:74` owns the course-end route — so its `useModel` read at `:32` is a reader under it and converts like the rest. **`SidebarContextProvider.jsx` does not hold it**: both its reads (`:33` `courseHomeMeta`, `:34` `coursewareMeta`) are `useModel`, so it gains a call here (and the `coursewareMeta` one in D3, #2089).
- **`HiddenAfterDue.jsx` reads `tabs`** and takes its link from B1's `getProgressTabUrl(tabs)`; worth checking in a course with a hidden-after-due subsection.
- **`?? {}` at every site**, per the `useModel`-returns-`{}` semantics.
