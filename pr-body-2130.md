## Summary

`course-home/data/api.js` becomes TypeScript, and every result shape is declared on the function that produces it, so `course-home/data/apiHooks.ts` imports its result types instead of declaring them — the course-home half of the sweep #2129 did for the courseware normalizers. The outline's two normalizers move to a new `courseHomeOutline.ts` with complete output types (`CourseHomeOutline` and its blocks, sections and sequences) and input types naming the fields they read; the fifteen passthroughs and posts each get a result type beside them that names the fields this repo's readers use, JavaScript readers included, and leaves the rest reachable as `unknown` (`CourseHomeMeta` moves here and gains seven such fields; `CourseHomeDates`, `CourseHomeProgress`, `ProctoringInfo`, `CourseLiveIframe`, `ExamAttempt` are new). The six `catch` blocks read the status through `getResponseStatus`. **No request or result changes**: both normalizer bodies are byte-identical to the JavaScript apart from annotations. Part of the Redux → React Query migration (#1946, Stage 1); stacked above #2149, which fixed the one outline read the complete type exposed as broken. Closes #2130.

## What changed

- **`api.ts`** (decisions 1–3, 6, 8): parameter types on all seventeen functions; result types beside each; `getResponseStatus` in the six `catch` blocks; `getTimeOffsetMillis` takes numbers.
- **`courseHomeOutline.ts`** (decisions 1–2, 7, 10): `normalizeCourseHomeOutline(courseId, data, timeOffsetMillis)` and `normalizeCourseHomeOutlineBlocks`, with `CourseHomeOutline`, `CourseHomeOutlineBlocks` / `Course` / `Section` / `Sequence` and the nested `CourseHome…` objects readers destructure. `getOutlineTabData` returns `CourseHomeOutline | Record<string, never>` for its 403 branch. Two reads the endpoint never answers (`navigation_disabled`, top-level `has_scheduled_content`) are typed optional with a note and left as they were.
- **`apiHooks.ts`** (decision 9): imports `CourseHomeMeta`, `CallToActionResponse` and `PostEventData` from `./api`; `useOutlineTabData` and `useExamAttemptsData` infer from the fetchers; `useCourseHomeMeta` keeps its `RequestError` generic.
- **Readers** (decisions 5, 11, 14): `outline-tab/utils.ts` imports `ProctoringInfo`; `SequenceLink` and `SequenceTitle` import `CourseHomeOutlineSequence`; `SequenceDueDate`'s `due` and `description` props become `string | null`, which the serializer sends; `SidebarContext`, `TabPage` and `CelebrationModal.test` import `CourseHomeMeta` from `./api`; `setupTest.js` and `CourseExit.test.jsx` drop the `rootSlug` argument #2084 removed.
- **`apiHooks.test.tsx`** (decision 13): two `data.` reads become `data?.` under the typed result.
- **Tests for four lines no suite reached** (decision 15): a new `courseHomeOutline.test.ts` for the normalizer's two `logInfo` branches, and two `api.test.js` cases for the proctoring fetch's LMS URL and `searchCourseContentFromAPI`, all uncovered in the JavaScript too but patch lines once the file moves.

## Testing

`npm run types` and `npm run lint` clean; full suite 120 suites, 1190 passed, 0 skipped; `api.ts` and `courseHomeOutline.ts` at 100% lines. `git grep "^export interface\|^interface" src/course-home/data/apiHooks.ts` returns only `QueryOptions`. The two `OutlineTab.test.jsx` cases that reply a bare 404 to the proctoring request now exercise the `{}` branch instead of a `TypeError` in the query function (decision 6); their assertions are unchanged. Smoke test on tutor local, 2026-10-01: the outline, courseware, progress and dates tabs load; the live tab and the proctoring 404 not run (the latter is pinned by the hook suite and hard to produce on tutor local).

## Decisions

<details>
<summary>Full decision log</summary>

# Decisions — type the course-home API module on the functions that produce its results (#2130)

Sibling of #2129, from its plan's sweep of everything that reshapes an API
response. Layer of the running stack #2141 above #2149 (#2148), branch
`bsmith/course-home-api-types`. Entries 1–5 were settled with the user in
the plan review (2026-10-01, `plan-2130.md`); the rest landed with the code.

1. **One new file for the determined normalizer; `api.ts` for the rest.**
   The inline normalization at the end of `getOutlineTabData` and
   `normalizeOutlineBlocks` move to `course-home/data/courseHomeOutline.ts`
   as `normalizeCourseHomeOutline` and `normalizeCourseHomeOutlineBlocks`,
   output types first, then the input types, then the functions, with a
   header naming the endpoint — #2129's shape (`data/<typeName>.ts` exports
   `normalize<TypeName>`), and the split `courseware/data/api.js` has
   between `getCourseMetadata` and `normalizeCoursewareMeta`. `api.ts` keeps
   the fetchers and declares each passthrough's result type beside its
   function, as `masquerade-widget/data/api.ts` does. One difference from
   `normalizeCoursewareMeta`: the outline normalizer takes
   `(courseId, data, timeOffsetMillis)` rather than the whole http response,
   so that `getTimeOffsetMillis` stays in `api.ts` for its two importers
   (`coursewareMeta.ts`, `api.test.js`) without `courseHomeOutline.ts`
   importing a value back from the module that imports it. The one import
   it does take from `api.ts`, `CourseHomeDateBlock`, is `import type`,
   erased at compile time. Both normalizer bodies are byte-identical to the
   JavaScript apart from the type annotations. The issue body said "`api.ts`,
   types beside functions"; it predates #2129's review, and the user took
   the new file once it was clear the only code change is the extraction.

2. **`CourseHome…` throughout.** The endpoint, as exposed, is `course_home` /
   `outline` (`GET api/course_home/v1/outline/{course_key}`; "Tab" exists only
   in the platform's class names, route name and docstring), and the repo
   already names this API's objects by module: `course_home` /
   `course_metadata` → `CourseHomeMeta`. So: `CourseHomeOutline`,
   `CourseHomeOutlineBlocks`, `CourseHomeOutlineCourse`,
   `CourseHomeOutlineSection`, `CourseHomeOutlineSequence`; the nested
   objects `CourseHomeAccessExpiration`, `CourseHomeCertData`,
   `CourseHomeCourseGoals`, `CourseHomeCourseTool`,
   `CourseHomeDatesBannerInfo`, `CourseHomeDatesWidget`,
   `CourseHomeEnrollAlert`, `CourseHomeResumeCourse`; and, by the same rule,
   the passthroughs `CourseHomeDates`, `CourseHomeProgress` (with
   `CourseHomeProgressSectionScore`, `CourseHomeProgressSubsectionScore`,
   `CourseHomeProgressAssignmentTypeGradeSummary`) and the shared
   `CourseHomeDateBlock` (one entry of `course_date_blocks`, which both the
   dates tab and the outline's dates widget carry). The user chose one prefix
   for everything: with as many versions of "course", "outline" and
   "sequence" as this application has, a `CourseOutlineSequence` under a
   `CourseHomeOutline` parent is one more thing to confuse, so #2129's
   settled `CourseOutlineSequence` is extended by its own rule rather than
   kept. Not `CourseOutline`: the platform's name for the learning-sequences
   object (`CourseOutlineView`), which `MinimalCourseOutline` models.
   Outside `course_home`: `CourseLiveIframe` (`/api/course_live/iframe/`),
   `ExamAttempt` (`proctored_exam/attempt` / `exam/attempt`),
   `ProctoringInfo` (kept; moved in from `outline-tab/utils.ts`, which now
   imports it), `CoursewareSearchResponse`, `UnsubscribeFromCourseGoalResponse`,
   `CallToActionResponse` (moved from the hooks, beside the two posts that
   return it) and `PostEventData` (the hooks' local `PostData`, now beside
   `executePostFromPostEvent`).

3. **"Name what we read."** A field goes on a passthrough's type because
   something in this repo reads it, JavaScript or TypeScript; nothing goes on
   because the serializer declares it; the serializer is consulted only for
   the nullability of a field we read. The hooks' comment had said
   "TypeScript readers", the issue body "this repo's readers"; the user chose
   the latter. The depth rule follows: a nested field is named where a reader
   destructures or accesses it, and every nested object keeps an index
   signature for the rest. Surveyed at implementation:
   - `CourseHomeMeta` gains `canViewCertificate`, `courseModes`, `isEnrolled`,
     `isMasquerading` (computed here), `isSelfPaced`, `isStaff`, `username`
     (`userTimezone` came in with #2148). `courseId`, `studioAccess` and
     `isNewDiscussionSidebarViewEnabled` are declared by
     `CourseHomeMetadataSerializer` and read by nothing.
   - `CourseHomeDates`: `courseDateBlocks`, `datesBannerInfo` (four fields),
     `hasEnded`; `learnerIsFullAccess` and `userTimezone` are unread.
   - `CourseHomeDateBlock`: the nine fields `Timeline.jsx`, `Day.jsx`,
     `DateSummary.jsx` and the alerts read; `linkText` and
     `firstComponentBlockId` are unread.
   - `CourseHomeProgress`: the nineteen top-level fields the twenty-three
     `useProgressData()` sites read, plus the two computed flags; nested
     `completionSummary`, `courseGrade`, `gradingPolicy.gradeRange`,
     `sectionScores[].subsections[]` (eleven fields), `assignmentTypeGradeSummary[]`
     (eight), `creditCourseRequirements.requirements[]` (five),
     `verificationData`, `certificateData`, `verifiedMode.upgradeUrl`.
   - `CourseHomeOutline`'s nested objects: `accessExpiration` (four fields,
     the whole `get_access_expiration_data` dict), `certData` (three),
     `courseGoals`, `courseTools[]`, `datesBannerInfo`, `datesWidget`
     (`courseDateBlocks`, `datesTabLink`; its `userTimezone` is unread since
     #606), `enrollAlert`, `resumeCourse`. `offer` and `verifiedMode` have no
     outline reader and stay `unknown`, as #2129 entry 4 left the courseware
     metadata's sub-objects.
   - `ProctoringInfo`: the five snake_case fields `ProctoringInfoPanel.jsx`
     and `outline-tab/utils.ts` read. `CourseLiveIframe`: `iframe`, optional
     because the view answers 200 with only a `developer_message` when the
     live tab is disabled. `ExamAttempt`: `exam`.

4. **The `userTimezone` read in `SequenceDueDate.tsx` was fixed below this
   layer (#2148, PR #2149), not deleted.** The complete outline type turned
   it into a compile error, and the history (in #2148) showed #606 broke it
   in 2021. With the fix in, this layer drops the `userTimezone?: string`
   placeholder #2093 had put on the hook's type without touching the
   component.

5. **The stale `rootSlug` arguments go.** `setupTest.js` and
   `CourseExit.test.jsx` still called `getCourseHomeCourseMetadata(courseId, 'courseware')`
   after #2084 removed the parameter; both are test files, the only callers
   of a function this layer gives a one-parameter signature.

6. **All six `catch` blocks read the status through `getResponseStatus`.**
   Three read `error?.response?.status` before; three read
   `error.customAttributes.httpErrorStatus`, which the real client's
   `processAxiosError` interceptor copies from `response.status`, so in
   production the two agree. `MockAuthService`'s client has no interceptors,
   so a plain `axiosMock.onGet(url).reply(404)` reached the second idiom with
   `customAttributes` undefined and the destructure threw a `TypeError`;
   `OutlineTab.test.jsx`'s two proctoring 404 cases did exactly that and
   passed because an errored query (`retry: false`) renders no panel either.
   They now exercise the `{}` branch; their assertions are unchanged.
   `apiHooks.test.tsx`'s hand-built errors carry `response.status`, so they
   keep working; their `customAttributes` lines are left as they are.

7. **The empty-object branches.** The caveat-form types make every field
   optional, as the hooks' `OutlineTabData` comment already did for the
   403 branch, so `{}` needs nothing more. The complete `CourseHomeOutline`
   cannot, so `getOutlineTabData` returns
   `Promise<CourseHomeOutline | Record<string, never>>` and `courseBlocks`
   is `CourseHomeOutlineBlocks | Record<string, never>` (`course_blocks` is
   `null` for an unenrolled learner on a course that is neither public nor
   public-outline): both `{}` sites are real, and `Record<string, never>`
   lets the TypeScript readers' optional chains (`Section.tsx`) type through.

8. **`getTimeOffsetMillis` takes numbers.** Both production callers pass
   `Date.now()`; `api.test.js` passes `Date` objects and stays JavaScript,
   coercing through `valueOf`.

9. **The hooks infer from the fetchers.** `useOutlineTabData` and
   `useExamAttemptsData` lose their hand-written `useQuery<…>` generics
   (`.exam || {}` infers `Record<string, unknown>[]` on its own);
   `useCourseHomeMeta` keeps `useQuery<CourseHomeMeta, RequestError>` for
   the error type. The three query functions whose hook takes
   `courseId: string | undefined` are called with `courseId!`, as their
   keys already were; `enabled` guards the call.

10. **Two fields the normalizer reads that the endpoint never sends.**
    `CourseBlockSerializer` emits no `navigation_disabled`, and
    `OutlineTabView` emits `has_scheduled_content` only per block, never at
    the top level (the platform's history has neither). So
    `CourseHomeOutlineSequence.navigationDisabled` and
    `CourseHomeOutline.hasScheduledContent` are always `undefined`. Neither
    has a reader of the outline data: the courseware's `navigationDisabled`
    comes from the sequence metadata, and the scheduled-content alert reads
    the per-course `hasScheduledContent` from `courseBlocks.courses`. #2129
    entry 5's treatment: optional on the input type with a trailing note,
    optional on the output, the reads left as they were (the issue rules out
    changing what a function returns). The outline factory's top-level
    `has_scheduled_content: null` is fixture-only.

11. **`SequenceDueDate`'s `due` and `description` props are `string | null`.**
    The serializer sends `null` for both (`block.get('due')`,
    `block.get('format')`), and `OutlineSequence` had typed them `string` to
    the reader; the component already handles the falsy case.

12. **Nullability, from the platform.** `DateSummarySerializer`
    (`assignment_type` default `None`, `complete` `allow_null`, `extra_info`
    `None` by default on the block); `ProgressTabSerializer` and
    `ProgressTabView` (`certificate_data` and `credit_course_requirements`
    `None` from their helpers, `studio_url` `None` unless the course is
    edited in Studio, `end` and `enrollment_mode` nullable, `letter_grade`
    `None` below passing, `override` and `url` `None` per subsection,
    `has_scheduled_content` from `get_xblock_field`); `CourseBlockSerializer`
    (`description`, `due`, `effort_*`, `icon`, `lms_web_url`,
    `has_scheduled_content`, `hide_from_toc` via `.get`);
    `get_access_expiration_data` and `get_cert_data` (`None` when not
    applicable); `CourseHomeMetadataSerializer` (`user_timezone` `None`
    without a preference; the rest non-null).

13. **`apiHooks.test.tsx` guards two reads.** `result.current.data.studioUrl`
    and `.gradesFeatureIsFullyLocked` compiled as `any`; under the typed
    result `data` is possibly undefined, so they become `data?.`.

14. **Commit: `refactor:`, no `!`.** No request or result changes. Nothing
    outside the repo names what moved: `OutlineSequence` had two in-repo
    type importers (`SequenceLink.tsx`, `SequenceTitle.tsx`),
    `OutlineTabData` was module-local, `CourseHomeMeta`'s four in-repo
    importers repoint to `./api`, and the READMEs reference the hooks, not
    the types' paths.

15. **Four lines no suite reached, pinned (codecov, 2026-10-01).** The move
    makes every line of the new files patch lines for codecov, which reported
    five missing; a full-suite coverage run showed four gaps, all uncovered
    in the JavaScript too: the normalizer's two `logInfo` branches (an
    unexpected block type; a section child that is not among the sequences),
    the LMS-URL branch of `getProctoringInfoData` (every suite configures
    `EXAMS_BASE_URL`), and `searchCourseContentFromAPI`, which the
    courseware-search hook suite mocks rather than runs. `courseHomeOutline.test.ts`
    (new, two hand-built block maps) pins the first two, asserting the
    logged message and that the odd block is skipped or the odd child kept
    in its section's `sequenceIds` without a back-reference; `api.test.js`
    gains a proctoring case asserting the LMS URL with the username, and a
    search case asserting the posted form and the camel-cased `data`. Both
    files are at 100% lines after.

Verify: `npm run types`, `npm run lint`, full suite 120 suites, 1190 tests;
`git grep "^export interface\|^interface" src/course-home/data/apiHooks.ts`
returns only `QueryOptions`.

</details>

<details>
<summary>Manual testing</summary>

# Manual testing — #2130 (types only)

No behaviour or request change; a smoke pass that the pages whose data this
layer types still render. Tutor local, 2026-10-01, by the user.

- [x] **Outline tab** loads; nothing looked broken.
- [x] **Courseware** loads; nothing looked broken.
- [x] **Progress tab** loads; nothing looked broken.
- [x] **Dates tab** loads; nothing looked broken.
- [ ] **Live tab** — not run.
- [ ] **Proctoring panel on a course without proctoring** — not run; the 404
      branch is hard to produce on tutor local (the LMS proctoring endpoints
      there answer 200 with an empty body) and is pinned by the hook suite.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
