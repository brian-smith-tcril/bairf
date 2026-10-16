Part of #1946 — Redux → React Query migration (Stage 1). Part of the #1977 model-store dissolution ([plan](https://github.com/openedx/frontend-app-learning/issues/1977)) — **Layer A**. Stacked on #2091, which converts the two suggested-schedule alerts to TypeScript first, since this layer changes their props.

**Goal:** read the `dates` and `outline` tab models from their own React Query results.

**Tasks**
- `dates` (3 sites) → `useDatesTabData(courseId).data`: `dates-tab/DatesTab.jsx:32`, `dates-tab/timeline/Timeline.jsx:14`, `suggested-schedule-messaging/UpgradeToCompleteAlert.jsx:22`.
- `outline` (12 sites in `course-home/outline-tab`) → `useOutlineTabData(courseId).data`: `OutlineTab.jsx:58`, the four alert hooks (`certificate-status-alert`, `course-end-alert`, `private-course-alert`, `scheduled-content-alert`), `section-outline/Section.tsx`, `section-outline/SequenceDueDate.tsx`, and the five `widgets/` readers (`CourseDates`, `CourseHandouts`, `CourseTools`, `StartOrResumeCourseCard`, `WelcomeMessage`).
- `outline` (2 cross-tab sites) → a **non-fetching** read, `useOutlineTabData(courseId, false)`: `alerts/enrollment-alert/hooks.js:15`, `alerts/logistration-alert/hooks.js:11`.
- The two `model`-prop alerts (`suggested-schedule-messaging/ShiftDatesAlert.tsx`, `UpgradeToShiftDatesAlert.tsx`) take their data from `OutlineTab`/`DatesTab` instead of keying `useModel` off a prop.
- **Not here:** the `dates` and `outline` `meta` entries stay on the bridge — see the findings below. They drop in #1999.

**Verify:** dates and outline tabs render identically; the enrollment and logistration alerts still appear only for private courses; **no outline-tab request on the dates/progress/live/discussion tabs** (check the Network tab, not just the tests); `git grep "useModel('outline'\|useModel('dates'" src` is empty.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **The bridge `meta` entries stay, contrary to the original plan.** `useAccessExpirationMasqueradeBanner` reads `useModel(tab, courseId)` with a *dynamic* tab slug, so it still resolves to the `dates` and `outline` models even though no literal `useModel('outline', …)` remains — a grep-based check reads clean while the reader is still there. Dropping the `meta` broke `OutlineTab.test.jsx`'s "renders page banner on masquerade". This is the same scoped one-reader bridge the progress tab kept in #1998, and all three entries drop together in #1999. The `meta` lines carry a `Transitional (#1999)` comment naming that reader.
- **The two cross-tab alert hooks must not start fetching.** `useEnrollmentAlert` and `useLogistrationAlert` are called by `LoadedTabPage`, which renders on *every* tab, but they read `useModel('outline', courseId)` — `{}` until some other page populates it, which is why they stay hidden off the outline tab. Swapping in `useOutlineTabData(courseId)` would fire the outline request on every tab. They need a read that subscribes to the cache entry without triggering a fetch, which is also faithful to the "populated once you've visited the outline tab" behavior they have today. `useOutlineTabData` takes a trailing `enabled` argument for this, matching `useProctoringInfoData`, rather than gaining a second hook named for fetch mechanics.
- **`useModel` returns `{}`, a pending query returns `undefined`.** Every converted site keeps a `?? {}` so destructuring still works before the query resolves.
- **`timeline/Day.jsx:29` is not part of this layer** — it reads `courseHomeMeta`, not `dates`, so it converts in layer B2.
- The two `model`-prop alerts straddle both model types (`model="outline"` from `OutlineTab.jsx:148-149`, `model="dates"` from `DatesTab.jsx:58,61`), so they convert here rather than being split across layers. Their parents own the data.
