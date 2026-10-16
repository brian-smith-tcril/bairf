Discovery, found while manually testing #2144 (#2089 layer B, in the Redux → React Query migration, #1946). Not part of the epic: nothing in it blocks the migration.

**Goal:** decide whether the courseware page (`CoursewareContainer`) needs to fetch `GET /api/learning_sequences/v1/course_outline/{courseId}` (`useMinimalCourseOutline`, `courseware/data/apiHooks.ts`) at all, or whether each thing it reads from that response can come from data the page already loads — and, either way, what the page should do when that request fails.

**Context — what the page keeps from the response.** `normalizeMinimalCourseOutline` (`courseware/data/minimalCourseOutline.ts`) keeps, per course, `title`, `sectionIds` and `hasScheduledContent`; per section, `title` and `sequenceIds`; per sequence, `title` and `sectionId`. Nothing else from the payload is retained. It is not the source of the outline sidebar: that is `GET /api/course_home/v1/navigation/{courseId}` (`useCourseOutlineStructure`), which carries sections → sequences → units with titles, ordering and completion (`courseNavigationOutline.ts`), fetched by the outline sidebar's hook with `staleTime: Infinity`.

**Readers of the learning-sequences outline** (non-test, at `master` after #2089 lands):

| Needs | Reader | Field(s) |
|---|---|---|
| Sequence order across sections | `useSequenceIds` → `sequence-navigation/hooks.js` (cross-sequence Previous/Next), `UnitNavigationEffortEstimate` (`nextSequence`), `CoursewareContainer` (the next section, for the first-section celebration) | `courses[id].sectionIds`, `sections[id].sequenceIds`, `sequences[id].sectionId` |
| "Course loaded" gate | `useIsCourseLoaded`: metadata + course-home metadata + this outline; gates the navigation links, `useSequenceIds`, the redirect rules, the breadcrumbs | `isSuccess` |
| Redirect rules (`redirects.ts`) | section-shaped URL detection (`sections[sequenceId]`), the resume fallback's first sequence, the outline-failure redirect | `sections`, `sectionIds`, `isError` |
| Titles | `Course.jsx`'s Helmet, "{sequence} \| {section} \| {course} \| {site}"; `CourseCelebration`'s page title | `sections[id].title`, `courses[id].title` |
| Course-end mode | `CourseExit`, `course-exit/utils.js` (`inProgress`) | `courses[id].hasScheduledContent` |
| Entrance exam | `useSequenceEntranceExamAlert` (`alerts/sequence-alerts/hooks.js`) | `sequences[id].sectionId` (compared with `entranceExamId`) |
| Widget availability | `SidebarContext`'s `buildWidgetCourse` spreads the course entry into `course` | `title`, `sectionIds`, `hasScheduledContent` |
| Breadcrumbs | `CourseBreadcrumbs` — plugin-inserted only; the slot has no default content | `courses`, `sections`, `sequences` |

Not readers: the unit (sequence metadata), the outline sidebar (`navigation`), the page shell and its title (course-home metadata, whose `title` is the unescaped one `LoadedTabPage` already shows).

**Observed** (tutor local, `master` behaviour, reproduced on stack #2141 with a simulated 500 at the top of `getLearningSequencesOutline`, 2026-09-30): the courseware page renders once the two metadata queries succeed — navigation disabled, `LoadedTabPage`'s title, as #2139 renders the pending state — then, after the query client's three retries (a 5xx is retried; ~7 s with the default backoff), `outlineFailureRedirect` sends the learner to `/course/{courseId}/home`. Accepted for the conversion: a retrying outline is a loading outline, and #2138 decided the page renders while the outline loads. What the redirect assumes is stale, though: its comment says "the page can't be built without an outline", which was true when `fetchCourse` built the whole page from it, and today the unit and the sidebar render without it.

**Tasks**
- For each row above, name the field the reader needs and whether a source the page already loads carries an equivalent: `navigation` for ordering and section/sequence titles, course-home metadata for the course title, sequence metadata for the sequence's own fields. Note where the two outline endpoints could disagree — the learning-sequences API applies the learner's schedule and visibility (it is where `hasScheduledContent` comes from), so ordering or membership taken from `navigation` has to be checked against that.
- Check whether `navigation` is fetched on every courseware load or only when the outline sidebar mounts, and what gates that (the sidebar toggles, widget availability).
- Decide: keep the fetch, and then whether a failure should still redirect or leave the page with navigation disabled; or replace the readers and drop the fetch, the gate and the redirect rule.

**Sequencing:** after #2135, which restates the redirect rules and their inputs; not blocking #1977.

**Not in scope:** the course-home tabs' own outline (`course_home/v1/outline`, the outline tab); making the breadcrumbs a standalone plugin.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
