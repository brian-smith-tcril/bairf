# Decisions — type the courseware normalizers on the functions that produce them (#2129)

Peeled out of #2088's layer B during its code review (2026-09-26): the review
asked why `SequenceMetadata` lived beside the hooks in `apiHooks.ts` rather
than on `normalizeSequenceMetadata`, whose body is the schema, and the answer
was that `courseware/data/utils.js` was JavaScript. The eighth layer of the
running stack #2121, on top of #2128 (#2088 layer A), branch
`bsmith/courseware-normalizer-types`; layer B is re-added on top once this
lands. Entries 2–4 follow the plan review (2026-09-26); the file split in
entry 1, the second half of entry 2 and entries 13–14 came from the code
review (2026-09-27); the rest landed with the code.

1. **Scope: the four courseware normalizers only, one file each.**
   `courseware/data/utils.js` goes; each of `normalizeMinimalCourseOutline`,
   `normalizeCoursewareMeta`, `normalizeSequenceMetadata` and
   `normalizeCourseNavigationOutline` (their names are entry 14) declares
   its input and output types in a file named after its top output type —
   `minimalCourseOutline.ts`, `coursewareMeta.ts`, `sequenceMetadata.ts`,
   `courseNavigationOutline.ts` (the renamed `courseOutline.ts`, which
   already held the navigation types and `applyUnitCompletion`) — each
   ordered output types, input type, normalizer, with a header naming the
   endpoint. A first version kept a single `utils.ts`; the review found its
   ordering hard to follow and the name a grab-bag pattern, and everything
   in it was a normalizer, so the split is one file per endpoint object,
   the shape `courseNavigationOutline.ts` already had. The course-home
   module (`course-home/data/api.js`, 384 lines, `getOutlineTabData` plus
   fifteen passthroughs) is the same kind of work at about twice the size,
   filed as #2130 and slotted after #2089.
   Nothing in `apiHooks.ts` re-exports: `CoursewareMeta`, `SequenceUnit`,
   `SequenceMetadata`, `SequenceMetadataData` and the outline types are
   imported from those files (the four importers outside the module —
   `apiHooks.test.tsx`, `bookmark/data/apiHooks.test.tsx`,
   `plugin-slots/UnitTitleSlot/index.tsx`, `sidebar/SidebarContext.tsx` —
   repointed). The plan expected #2128's breaking-change footer to need
   amending to the new path; checked at submit, it names `useUnit` at
   `courseware/data/apiHooks`, where the hook stays, and `SequenceUnit`
   without a path, so nothing there is stale. `DiscussionTopic` stays beside
   its query: it is a raw payload passed through, not a normalizer's
   output.

2. **Names follow the endpoint each type models.** The survey of the five
   endpoints (`plan-2129.md`) and the rule `CourseHomeMeta` and
   `DiscussionTopic` already follow: a type is named after the endpoint
   object it models, partial or not.
   - `/api/courseware/sequence/` (platform view `SequenceMetadata`):
     `SequenceMetadata`, `SequenceUnit`, `SequenceMetadataData` — unchanged.
   - `/api/courseware/course/` (platform class `CoursewareMeta`):
     `CoursewareMeta` — unchanged.
   - `/api/course_home/v1/navigation/` (`CourseNavigationBlocksView`):
     `courseOutline.ts` → `courseNavigationOutline.ts`, `CourseOutlineData` →
     `CourseNavigationOutline`, `CourseOutlineSection` / `Sequence` / `Unit`
     → `CourseNavigationSection` / `Sequence` / `Unit`. The file stays a
     module (it also holds `applyUnitCompletion`); only its names change.
     This frees the `CourseOutline…` prefix for the outline tab's own
     endpoint, `/api/course_home/outline/`, whose sequence type becomes
     `CourseOutlineSequence` in #2130 (the reviewer's preference over the
     platform's view name, `OutlineTabSequence`). The top type's suffix was
     settled in review: a first version named it `CourseNavigationBlocks`
     after the platform view (`CourseNavigationBlocksView`, response key
     `blocks`), which left the file naming its own data two ways — every
     local name for it says "outline" (`getCourseOutline`,
     `coursewareQueryKeys.courseOutline`, `useCourseOutlineStructure`,
     `normalizeOutlineBlocks` as it then was, `applyUnitCompletion`'s
     `outline`, the `course-outline` sidebar). "Outline" is the repo's word for this tree,
     and "Navigation" is what keeps it apart from the outline tab's data, so
     the tree is `CourseNavigationOutline`. The children keep the shorter
     `CourseNavigationSection` / `Sequence` / `Unit`, the way
     `MinimalCourseOutline` holds `MinimalSequenceMetadata` and
     `SequenceMetadataData` holds `SequenceUnit`: the qualifier describes
     the tree, not each block in it. Reverting to `CourseOutline*` was
     weighed and not taken, since it would hand #2130 the collision back.
     The file followed the type: it had become `courseNavigation.ts` with
     the first rename, and since it was moving anyway, `courseNavigationOutline.ts`
     matches its top type the way the other three files do.
   - `/api/learning_sequences/v1/course_outline/` (`CourseOutlineView`):
     `MinimalSequenceMetadata { id, title, sectionId? }`,
     `MinimalSectionMetadata`, `MinimalCourseMetadata`, `MinimalCourseOutline`
     (the map). The endpoint returns a user-specific outline — structure plus
     scheduling, access and exam state — and the normalizer keeps only the
     hierarchy and titles, consuming the rest as a release filter. Set
     against `SequenceMetadata`, the overlap is `id` and `title`, so the name
     states the contrast with it, which is what a reader of `Sequence.jsx`,
     where both appear, most needs. Not chosen: the platform's own names
     (`CourseOutline` / `CourseLearningSequence` claim the full object, and
     `CourseOutline…` is the outline tab's prefix), `CourseStructure*`
     (invents a word), `SequenceIdentifiers` (plural reads as a list of
     ids), `SequenceIdentity`, `SequenceRef` / `Listing` / `Header`,
     `SequenceBasics` (the runner-up). The map's name, `MinimalCourseOutline`,
     was accepted in review as the best of the candidates rather than a
     favourite: `useMinimalCourseOutline` only caches it and every reader
     indexes into one of its three records, so no consumer of the whole map
     exists to lend it a better one. B's `OutlineSequence` /
     `CoursewareOutlineData` become these when B rebases.

3. **Inputs are typed as the fields each normalizer reads, open-ended, and
   not exported.** `CourseOutlineResponse`, `CoursewareMetadataResponse`
   (the whole http response — `headers.date` feeds `getTimeOffsetMillis`),
   `SequenceMetadataResponse`, `CourseNavigationBlockResponse`, each with an
   index signature and a one-line note above it in place of
   `DiscussionTopic`'s longer one. Nothing outside their files needs them:
   `api.js` is JavaScript and hands the responses over untyped. Field
   nullability comes from the platform (checkout at
   `openedx-platform`): `CourseInfoSerializer` and the `CoursewareMeta`
   properties for the metadata, `SequenceBlock.get_metadata` /
   `_get_render_metadata` / `get_content_titles`-era `block_info` for the
   sequence, `CourseOutlineView.to_representation` for the learning-sequences
   outline, `CourseBlockSerializer` under `CourseNavigationBlocksView`'s
   context for the navigation blocks.

4. **`CoursewareMeta` is typed fully.** All thirty fields
   `normalizeCoursewareMeta` builds, scalars typed as the serializer declares them (`string | null`
   where the platform property can return `None`: the four dates, `license`,
   `language`, `userTimezone`, `marketingUrl`, `verifyIdentityUrl`,
   `linkedinAddToProfileUrl`, `enrollmentMode`); the eight camel-cased
   sub-objects (`accessExpiration`, `courseGoals`, `offer`, `notes`,
   `celebrations`, `certificateData`, `entranceExamData`, `relatedPrograms`)
   are `unknown` until a reader names their insides (the plan said nine; it
   is eight). The index-signature placeholder goes: the normalizer's output
   has exactly these keys. `SidebarContext`'s `course: CourseHomeMeta &
   CoursewareMeta` stays open-ended through `CourseHomeMeta`'s own index
   signature, so plugins reading other keys off the context are unaffected.

5. **`SequenceMetadata` is typed from `SequenceBlock.get_metadata`, which
   corrects three guesses in B's draft.** `bannerText` and `format` are
   always present and nullable (`string | null`), not optional: the platform
   always emits the keys (`banner_text` defaults to `None`, `format` to the
   inherited field's value). `gatedContent` is always present, and
   `_get_gated_content_info` builds all five keys, so `SequenceGatedContent`
   is `{ gated: boolean; prereqId / prereqUrl / prereqSectionName: string |
   null; gatedSectionName: string }` rather than five optionals.
   `allowProctoringOptOut` is the one optional: `allow_proctoring_opt_out`
   never appears in the metadata payload (the platform emits it only in the
   exam view's context), so the normalizer's read is `undefined` on every
   response and the input type says so with a trailing note. The read is
   left as it was (`SequenceExamWrapper` receives the object); whether it is
   dead is a question for that library, not this layer.

6. **`SequenceUnit.complete` is `complete?: boolean`, not `boolean | null`.**
   The platform sets `block_info['complete']` only for a signed-in user on a
   `vertical` child, so the raw field is a boolean or absent; the `null` in
   A's type came from the factory (`complete: unitBlock.complete || null`),
   which B's review already rejected as typing the tests' shape. No reader
   distinguishes `null` from `undefined` (`useCheckBlockCompletion`,
   `UnitButton` and the outline writer all test truthiness), and
   `npm run types` passed unchanged. Flagged for review because it edits a
   type A settled.

7. **`completion_stat` is present, and the optional chains stay.** The
   navigation view's `mark_complete_recursive` sets `completion_stat` on
   every block it returns (both branches), so `CourseNavigationBlockResponse`
   declares it present and `CourseNavigationSequence` / `Section` keep
   `completed: number; total: number`; `applyUnitCompletion`'s arithmetic
   on `completed` is sound against the platform. The serializer's
   `block.get('completion_stat', {})` default is defensive and unreachable
   from that view. The normalizer's `block.completion_stat?.completion` is
   left as written (#1386): the suites' blocks come from
   `courseBlocks.factory`, which omits the field, and `CompletionIcon`
   defaults a missing stat to 0. Typing the output optional instead would
   have put `?? 0` into `applyUnitCompletion`'s roll-up, a behaviour change
   for a fixture-only state.

8. **`normalizeCourseNavigationOutline` loses its `courseId` parameter.**
   As `normalizeOutlineBlocks` it was copied from the course-home
   `normalizeOutlineBlocks` in #1375, where `courseId` builds the course
   entry; the courseware copy never read it, and `noUnusedParameters`
   flagged it under TypeScript. Dropped rather than underscored; the four
   callers (`api.js`'s `getCourseOutline` and three sites in
   `apiHooks.test.tsx`) pass only `blocks`. The course-home function keeps
   its parameter; #2130 types it.

9. **`now` is `Date.now()`.** `now >= Date.parse(...)` with `now: Date` is a
   TypeScript error (no relational operator between `Date` and `number`);
   the comparison coerced through `Date.prototype.valueOf`, so a number
   compares the same.

10. **Comments that the types now carry go.** The `/* Example structure of
    gated_content … */` block and the JSDoc `@param` / `@returns` on the
    navigation normalizer restated what `SequenceGatedContent` and the
    signature say. The two inline notes on `isReleased` and the 1-indexed
    position stay: they explain the platform, not the shape.

11. **Verify, plus one new suite.** `npm run lint`, `npm run types`, full
    suite; no normalizer output changed (the hook suite asserts each
    normalizer's output against the factories through its query;
    `lmsPact.test.jsx` asserts the outputs against the contract). Coverage
    on the converted file showed one branch no suite reached: the release
    filter's skip of an unreleased section whose sequences are all
    unreleased (`utils.js` line 41 before, uncovered there too, but the
    rewrite makes every line of the new files patch lines for codecov).
    `minimalCourseOutline.test.ts` pins it with two hand-built responses:
    the section and its sequence go, and `hasScheduledContent` is true;
    with the sequence marked `accessible` (staff), the section stays and it
    is false.

12. **Commit: `refactor:`.** No behaviour or request change; the one
    signature change (entry 8) is to a function only `api.js` and its tests
    call. Not `!`: nothing has shipped from the drafts, and no published
    footer names a path this layer moves (entry 1).

13. **`useCoursewareOutline` → `useMinimalCourseOutline`.** Typing the hook
    `useQuery<MinimalCourseOutline>` put the hook's name and its result's
    name side by side, and the hook's said more than the data carries: it
    is the learning-sequences outline stripped to ids and titles, not "the
    courseware outline". Nothing merged or pushed points a plugin at the
    hook for its data — #2023 introduced it and #2102 added its `enabled`
    option, both plain `refactor:`; the eight `refactor!` footers on the
    stack name other hooks; the READMEs do not mention it — so the rename
    costs nothing outside this repo. Five call sites (`useCoursewareRedirects`,
    `useIsCourseLoaded`, `CourseExit`, `MountCourseQueryHooks`, the hook
    suite); `useCoursewareOutlineSidebarToggles` is a different query and
    keeps its name. Layer B's footer, the first to point a plugin at the
    hook, names `useMinimalCourseOutline` when it rebases.

14. **The normalizers are named after their output types.** `normalizeMetadata`
    → `normalizeCoursewareMeta`, `normalizeLearningSequencesData` →
    `normalizeMinimalCourseOutline`, `normalizeOutlineBlocks` →
    `normalizeCourseNavigationOutline`; `normalizeSequenceMetadata` already
    was. The review started from `normalizeMetadata`, which beside
    `courseHomeMeta` says nothing about which metadata, and from
    `normalizeOutlineBlocks`, named for its input while its file and output
    are the navigation outline. With one file per output type the rule is
    `data/<typeName>.ts` exports `normalize<TypeName>`, so file, function
    and type line up and `api.js` reads `getCourseOutline` →
    `normalizeCourseNavigationOutline`. Every caller is inside
    `courseware/data` (`api.js`, the hook suite, the outline suite); nothing
    outside the module or the repo names these functions. The course-home
    `normalizeOutlineBlocks` is a different function and #2130's to name.
    A path comment in `CourseExit.test.jsx` that pointed at `isReleased` in
    `utils.js` now points at `minimalCourseOutline.ts`.

Full suite on this layer: 117 suites, 1189 tests.
