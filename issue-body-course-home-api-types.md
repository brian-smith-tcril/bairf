Part of #1946 — Redux → React Query migration (Stage 1). Sibling of #2129, from its plan's sweep of everything that reshapes an API response.

**Goal:** convert `course-home/data/api.js` to TypeScript, type the two normalizers it contains on the functions themselves, and give every passthrough a result type declared beside the function that returns it — so `course-home/data/apiHooks.ts` imports its result shapes instead of declaring them.

**Context.** The module is 384 lines and seventeen functions, of two kinds:

- **Two determined normalizers**, whose output is fully known because the function picks the fields: `getOutlineTabData` (about 65 lines, ~20 picked fields) and the module's own `normalizeOutlineBlocks` (about 75 lines, building the outline tab's `courses` / `sections` / `sequences` maps; a second copy, distinct from the courseware one). These get the #2129 treatment: an input type naming the snake-case fields the function reads, left open, and a complete output type with no caveat. The partial `OutlineTabData` and `OutlineSequence` at the hook become complete and move here.
- **Fifteen passthroughs and posts** — `normalizeCourseHomeCourseMetadata` (`CourseHomeMeta`, already the caveat form at the hook), `getDatesTabData`, `getProgressTabData` (a passthrough plus four computed `gradesFeature…` flags and a `gradeRange` re-assignment), `getProctoringInfoData`, `getLiveTabIframe`, `getCoursewareSearchEnabled`, `searchCourseContentFromAPI`, `getExamsData`, and the six `post*` / `unsubscribe*` functions. `camelCaseObject` is declared `any` in frontend-platform, so today each returns `any`; under TypeScript each gets the partial-with-caveat result type the repo already uses for `CourseHomeMeta` and `DiscussionTopic` — the fields this repo's readers use, the rest left `unknown`, with the note that the full shape is openedx-platform's to describe. `CourseHomeMeta` moves from the hook to beside its function.

Six `catch (error)` blocks read `error?.response?.status` or `error.customAttributes.httpErrorStatus` on an untyped value; under TypeScript they go through `getResponseStatus` from `src/data/http-error`, the helper the query layer already uses.

**Tasks**
- `api.js` → `api.ts`; parameter types on all seventeen functions.
- `getOutlineTabData` and `normalizeOutlineBlocks`: input and full output types on the functions; `OutlineTabData` / `OutlineSequence` completed and moved from `apiHooks.ts`.
- One caveat-form result type per passthrough, declared beside its function, naming what the readers use (the tab readers converted in #2083 / #2085 / #1998 / #2002 / #2003, so the used fields are greppable); `CourseHomeMeta` moves.
- The six error handlers on `getResponseStatus`.
- `apiHooks.ts` imports the moved types; `api.test.js` stays JavaScript.

**Not in scope:** any change to what a function returns; the courseware normalizers (#2129); `tab-page/`, which #1999 touches next.

**Sequencing:** not blocking any current layer — the course-home tabs' readers have all converted. Best slot: after #2089 and before #1999, which is the next work to touch `tab-page/` and `CourseHomeMeta`.

**Verify:** `npm run types`, `npm run lint` and the full suite green with no result changed; `git grep "^export interface\|^interface" src/course-home/data/apiHooks.ts` returns only the hook-local option and payload types.

> [!NOTE]
> This issue was authored by Claude (Claude Code) and reviewed before posting.
