Part of #1946 — Redux → React Query migration (Stage 1). Follow-up from #2088's two layers, where the review asked why the normalized shapes are declared beside the query hooks rather than on the functions that produce them.

**Goal:** convert `courseware/data/utils.js` to TypeScript and type its four normalizers' outputs on the functions themselves, so `courseware/data/apiHooks.ts` imports the shapes from where they are made instead of declaring them.

**Context.** `utils.js` (209 lines) holds `normalizeLearningSequencesData`, `normalizeMetadata`, `normalizeSequenceMetadata` and `normalizeOutlineBlocks`. Each picks a fixed set of fields from a raw endpoint response, so each output shape is fully known — the normalizer *is* the schema, and no index-signature caveat is needed (unlike `DiscussionTopic`, which is a raw payload passed through). The types describing those outputs currently live in two places:

- `courseware/data/courseOutline.ts` — `CourseOutlineData` and its unit / sequence / section interfaces, declared "as produced by `normalizeOutlineBlocks`" in a sibling file (the existing precedent).
- `courseware/data/apiHooks.ts` — `CoursewareMeta` (an index-signature placeholder for `normalizeMetadata`, filled by #2089), `SequenceUnit` (#2128), `SequenceMetadata`, `SequenceGatedContent`, `SequenceMetadataData`, `OutlineSequence` and `CoursewareOutlineData` (#2088's sequences layer).

The inputs are the raw snake_case responses (`/api/courseware/sequence`, `/api/courseware/course`, `/api/learning_sequences/v1/course_outline`, the navigation-sidebar blocks). `normalizeOutlineBlocks` is also called from `course-home/data/api.js` for the outline tab's blocks.

**Tasks**
- `utils.js` → `utils.ts`. Each normalizer's return type is declared on the function; the interfaces move from `apiHooks.ts` (and, if it reads better in one place, from `courseOutline.ts`) to sit beside the functions that produce them, and `apiHooks.ts` imports them.
- Type the inputs as far as the endpoints' shapes are known. Where a raw payload is only partly described, an input type with an index signature and the `DiscussionTopic`-style note ("the full shape is openedx-platform's to describe") is the honest form; do not fake completeness.
- `CoursewareMeta` stays a placeholder until #2089's readers name its fields; only its home moves.
- Re-export or re-import so that plugins importing `SequenceUnit` / `SequenceMetadata` from `courseware/data/apiHooks` keep working, or note the moved path in the commit's breaking-change footer if they do not.

**Not in scope:** changing any normalizer's behavior or fields; `course-home/data/api.js`; the `DiscussionTopic` type, which describes a raw payload and stays with its query.

**Verify:** `npm run types`, `npm run lint` and the full suite green with no normalizer output changed; `git grep "interface Sequence\|interface CoursewareOutline\|interface OutlineSequence" src/courseware/data/apiHooks.ts` is empty.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
