Part of #1946 — Redux → React Query migration (Stage 1). Found while planning #2130.

**Goal:** make the outline tab's sequence due dates format in the learner's timezone preference, as every other date on the tab does.

**Cause.** `SequenceDueDate.tsx` reads `userTimezone` as a top-level key of the outline tab data (`useOutlineTabData(courseId, { enabled: false }).data?.userTimezone`). No such key exists: `GET /api/course_home/v1/outline/{course_key}` carries `user_timezone` only inside `dates_widget` (`DatesWidgetSerializer`, since openedx-platform `84b08f366d`, AA-122), and `getOutlineTabData` has never emitted a top-level `userTimezone`. So the value is always `undefined`, `timezoneFormatArgs` is always `{}`, and `FormattedTime` falls back to the browser's zone.

It was correct once. #198 (`9cbe0b7c`, 2020) introduced the due date reading the right place, `const { datesWidget: { userTimezone } } = useModel('outline', courseId)`. #606 (`70e2aa02`, 2021, AA-877) set out to "update `userTimezone` to come from `CourseHomeCourseMetadata` rather than the individual tabs", once the platform had added `user_timezone` to `course_metadata` (`fe435987b0`); it made that change in `OutlineTab.jsx` and `CourseDates.jsx`, and in `SequenceLink.jsx` removed the `datesWidget` nesting but left the model as `'outline'`:

```diff
   const {
-    datesWidget: {
-      userTimezone,
-    },
+    userTimezone,
   } = useModel('outline', courseId);
```

The read has yielded `undefined` since. #1632 carried it into `SequenceDueDate.tsx` unchanged, and #2093 added `userTimezone?: string` to the hook's `OutlineTabData` type so it would compile — a type written to the reader, not the data.

**Timeline**

| When | Change | Sequence due-date timezone |
|---|---|---|
| 2020-06 | #82 adds the dates widget; the platform puts `user_timezone` inside `dates_widget` (`84b08f366d`) | no sequence due dates yet |
| 2020-08-31 | #198 adds due dates to `SequenceLink.jsx`, reading `datesWidget.userTimezone` off the outline model | working |
| 2021-08-16 | the platform adds `user_timezone` to `course_metadata` (`fe435987b0`) | working, unchanged |
| 2021-09-03 | #606 moves the tab's timezone reads to the metadata; in `SequenceLink.jsx` it drops the `datesWidget` nesting but leaves the model as `'outline'` | **broken from here** — `outline.userTimezone` does not exist |
| 2025-03-18 | #1632 rewrites `SequenceLink.jsx` as the TypeScript section-outline components; `SequenceDueDate.tsx` carries the flat read verbatim | broken, same read |
| 2026-09-22 | #2093 swaps `useModel('outline')` for `useOutlineTabData` and adds `userTimezone?: string` to the hook's type so it compiles | broken, with a type that claims the field |
| 2026-10-01 | planning #2130 types the outline from what the normalizer emits; the read becomes a compile error | surfaced |

`SequenceDueDate` renders only inside the outline tab (`OutlineTab` → `CourseHomeSectionOutlineSlot` → `Section` → `SequenceLink`), where both the metadata and the outline queries are loaded, so the fix is finishing #606: the change it made in `OutlineTab.jsx` and `CourseDates.jsx` and missed here.

**From the code, not yet observed:** with a `user_timezone` preference set (e.g. `Asia/Tokyo`) in a browser on another zone, the dates widget and the course-end alert on the outline tab show the preference's zone and the subsection due dates show the browser's.

**Tasks**
- A failing test first: render a section with a due-dated sequence under a course-home metadata response carrying `user_timezone`, and assert the formatted zone (`Section.test.tsx` sets no timezone today).
- Then the change #606 meant to make: read `useCourseHomeMeta(courseId, { enabled: false }).data?.userTimezone`, as `CourseDates.jsx` and `Day.jsx` do.

**Sequencing:** lands below #2130. That layer types the outline data from what the normalizer emits, which turns this read into a type error; fixing the read first lets #2130 drop the `userTimezone?` placeholder without touching the component.

**Verify:** the new test fails on `master` and passes with the change; the full suite is green; on tutor local, with a timezone preference set, a subsection due date on the outline tab shows the preference's zone abbreviation.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
