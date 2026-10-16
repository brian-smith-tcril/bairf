Part of #1946 — Redux → React Query migration (Stage 1). Peeled out of #2083 (layer A of the model-store dissolution, #1977), the way #2065 was peeled out of #2014: a structural change first, so the conversion layer's diff stays about the data source.

**Goal:** convert the two suggested-schedule alerts to TypeScript, so #2083 adds props to a `Props` interface rather than growing `propTypes` it is about to replace.

**Tasks**
- `course-home/suggested-schedule-messaging/ShiftDatesAlert.jsx` → `.tsx`
- `course-home/suggested-schedule-messaging/UpgradeToShiftDatesAlert.jsx` → `.tsx`
- `propTypes` + `defaultProps` → a `Props` interface with destructuring defaults, the shape `UnitButton` uses (#2065).

**Not in scope:** `UpgradeToCompleteAlert.jsx`, which #2083 leaves with the same props it has today — only its data source changes — so it stays `.jsx` until something needs it converted.

**Verify:** no behavior change; both alerts still read `useModel(model, courseId)`; `npm run types`, `npm run lint` and the full suite green.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.

**Findings that shape the task list**

- **These two components are the ones #2083 gives new props.** It passes `datesBannerInfo` and `hasEnded` down from the tabs instead of having each alert select a model by name, so both prop lists change. Converting first means that layer edits an interface instead of editing `propTypes` that TypeScript would delete a layer later.
- **`ShiftDatesAlert` needs `courseId` narrowed, not asserted.** It feeds `courseId` to `courseHomeQueryKeys.datesTab`/`outlineTab` and to the reset-deadlines mutation, all of which want `string`, while `useParams()` yields `string | undefined`. Rather than three `courseId!` assertions, `!courseId` joins the early return the component already has, which narrows it for the rest of the body including both closures. The repo's existing `courseId!` uses all sit in `apiHooks.ts` beside `enabled: !!courseId`, where the query cannot run with an undefined id — a component-level assertion has nothing backing it.
- **That guard is unreachable today, deliberately so.** With an undefined `courseId`, `useModel` returns `{}`, so destructuring `datesBannerInfo` off it throws before the guard is reached. It only becomes reachable after #2083 passes that data in as a prop, and even then only off a course route — where it now renders nothing instead of a button that would POST `course_key: undefined`.
- **No test changes.** Neither component has its own test file; both are exercised through `DatesTab.test.jsx` and `OutlineTab.test.jsx`.
