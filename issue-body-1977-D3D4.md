Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layers D3 + D4**. Two stacked PRs under one issue; depends on D1/D2 (#2088). Removes the last courseware bridge entries.

**Goal:** read the `sections` and `coursewareMeta` models from the courseware queries, convert the seven direct `state.models` selectors, and drop the `coursewareMeta` / `sections` / `sequences` / `units` mirrors from the bridge.

**Context.** `coursewareMeta[courseId]` is a **merge**: `normalizeMetadata(...)` from `useCoursewareMetadata` plus `{ id, title, sectionIds, hasScheduledContent }` from `useCoursewareOutline`'s `courses` map. `sections` comes only from the outline query. So each converted field reads from whichever of the two queries produces it.

**Tasks — D3, `sections` (4) + `coursewareMeta` (17)**
- `sections`: `courseware/course/Course.jsx:36`, `sequence/Sequence.jsx:47`, `breadcrumbs/CourseBreadcrumbs.jsx:24`, `courseware/data/apiHooks.ts:62` (`useSequenceIds`).
- `coursewareMeta` → `useCoursewareMetadata(courseId, { enabled: false }).data` or `useCoursewareOutline(courseId, { enabled: false }).data` per field: `alerts/sequence-alerts/hooks.js:22`, `course-home/progress-tab/certificate-status/CertificateStatus.jsx:23`, `courseware/course/` (12: `Course.jsx:29`, `breadcrumbs/CourseBreadcrumbs.jsx:19`, `course-exit/CourseCelebration.jsx:52`, `course-exit/CourseExit.jsx:27`, `course-exit/utils.js:84`, `sequence/Sequence.jsx:41`, `sequence/Unit/UnitSuspense.jsx:22`, `sequence/Unit/hooks/useShouldDisplayHonorCode.js:13`, `sequence/lock-paywall/LockPaywall.jsx:27`, `sequence/sequence-navigation/hooks.js:14`, `sidebar/SidebarContextProvider.jsx:34`, `sidebar/sidebars/course-outline/hooks.js:26`), `courseware/social-share/SocialIcons.jsx:32`, `widgets/upgrade/src/UpgradePanel.jsx:28`, `courseware/data/apiHooks.ts:61`.
- Move `useSaveIntegritySignature`'s `userNeedsIntegritySignature` write (`courseware/data/apiHooks.ts:235-241`) onto the metadata query.
- Confirm the `title` collision is inert (see below).
- Update the `useModel('coursewareMeta', …)` example in `courseware/course/sidebar/README.md:185`.

**Tasks — D4, the direct selectors**
- `CoursewareContainer.tsx:39,42,52` (`coursewareMeta`, `sequences` ×2) and `redirects.ts:256,259,262,266` (`sequences`, `sections` ×2, `coursewareMeta`) → the owning queries; delete `courseware/data/modelReader.ts`.
- Remove the `models:` mirrors from `useCoursewareMetadata`, `useCoursewareOutline` and `useSequenceMetadata` in `courseware/data/apiHooks.ts`.

**Verify:** courseware loads, breadcrumbs render, all five redirect rules still fire (resume, section→sequence, section/unit→unit, unit→sequence/unit, outline failure), the integrity-signature modal dismisses and stays dismissed; `git grep "readModels\|state.models" src` returns only the model store itself and `setupTest.js`; no `react-redux` import left in `src/courseware/`.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **`coursewareMeta.title` is written by both queries** — `data.name` from `normalizeMetadata`, and the outline's own `title` — so today the last write wins. No reader of `coursewareMeta.title` was found, so the collision looks inert; confirm before picking a source.
- **`useSequenceIds` is itself a model reader** (`apiHooks.ts:61-62`: `coursewareMeta.sectionIds` then `useModels('sections', …)`), so it converts here even though it lives in the data layer, and `CoursewareContainer`/`UnitNavigationEffortEstimate`/`sequence-navigation/hooks.js` inherit the fix. **Its new outline observer must not fetch** (#2098, decision 4): `useSequenceIds` and `useIsCourseLoaded` are non-fetching by design, with `CoursewareContainer` owning the outline fetch through `useCoursewareRedirects`.
- **`{ enabled: false }` at every reader (updated after #2098).** The courseware readers render under `CoursewareContainer`, and the course-exit ones under `CourseExit`, both of which fetch the two queries; as fetching observers they would refetch on mount. The owners' own direct selectors (D4: `CoursewareContainer.tsx`, `redirects.ts`) read from the results of the queries they already call.
- **`CertificateStatus.jsx:23` is a cross-page read.** It renders on the progress tab and reads only `entranceExamData`, but nothing on the progress tab fetches the courseware metadata, and tab clicks are full page loads that discard the cache — so in practice that field is `undefined` there today. `{ enabled: false }` keeps that behaviour, as #2083 did for the outline alerts on other tabs. Whether the progress tab should fetch it is a separate question, likely pre-dating the migration, and not this conversion's.
- **`redirects.ts` reads `sections[sequenceId]`** (`sectionViaSequenceId`) — i.e. it deliberately looks a *section* up by the route's sequence id to detect a section-shaped URL. Preserve that, it is not a typo.
- **This is where `react-redux` leaves the courseware subtree**, so it is the natural place to check that nothing but the model store itself still imports it.
