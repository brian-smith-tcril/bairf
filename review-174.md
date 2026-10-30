# Review: openedx/frontend-app-catalog#174 — refactor: rename course catalog data to catalog data [FC-0137]

https://github.com/openedx/frontend-app-catalog/pull/174

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

First of the 5-PR split of openedx/frontend-app-catalog#169 (rpenido, open-craft fork). #175 is stacked on this branch by content, and the body says PRs 2 to 5 build on it, so this one unblocks catalog 175 to 178. kdmccormick requested changes 2026-10-28, then approved 2026-10-29. Not yet read.

## Passes

One row per pass. `bin/review sync` appends the row with the new head; scope (whole diff, named files or commits) and outcome (none, comments, approve, request changes) are filled in by hand. Since the last pass: `git diff <previous head>..<head>` in the code worktree, or `git range-diff` across a rebase.

| date | base | head | scope | outcome |
|------|------|------|-------|---------|
| 2026-10-30 | 586f5f6d7f | ead6afdfbd | | |

## Ledger

One entry per question, newest last: `### N. <question>`, a `Status:` line, a `Rests on:` line, then what was found, why no comment was needed, or what was posted. Status is one of: open; resolved, no comment; posted <thread url>; parked; stale. "Rests on" names the files and the head SHA the answer was reached at; a pass marks an entry stale when those files changed since.

### 1. Does anything in the app call the new endpoint, and is the ADR still Proposed?

Status: resolved, no comment
Rests on: docs/decisions/0003-use-a-generic-catalog-search-endpoint.rst, src/data/catalog-list-search/urls.ts, src/data/catalog-list-search/api.ts at ead6afdfbd

The ADR's Status section reads `Proposed`. Outside `docs/`, the only mention of `catalog_search`, `catalog_list_search` or `search/v1` is a code comment in `urls.ts`. The one search URL builder is `getCourseListSearchUrl()`, returning `/search/unstable/v0/course_list_search/`, called from `api.ts` line 48. No code path reaches the new endpoint.

### 2. The code comment and the PR body name the new endpoint `catalog_list_search`; the ADR names it `catalog_search`

Status: open
Rests on: src/data/catalog-list-search/urls.ts lines 5-8 at ead6afdfbd; PR body "planned generic `catalog_list_search` endpoint"

The ADR said `catalog_list_search` in c6f24b2 and 8ee4ecb; 7fb99a9 (answering kdmccormick's thread on not keeping two endpoints) renamed it to `/search/v1/catalog_search/`. The `urls.ts` comment was written in the rename commit 26ba130 and not updated, and the PR body still carries the old name. From this change, not pre-existing; the fix is one word in the comment and one in the body. Candidate comment. Brian's direction (2026-10-30): the review will ask for one name across the ADR's endpoint and the app's identifier family, and say which. Name families at ead6afdfbd: `catalog-list-search` / `CatalogListSearch` (this PR's renames, 21 and 14 files), `CourseListSearch` (the types deliberately left for the next PR, 13 files), `CatalogSearch` (5 files, all the pre-existing public slot `CourseCatalogSearchFieldSlot`, on master already and not part of this family), the ADR's endpoint `catalog_search` (0 files in src).

### 3. The slot props kept under their old names need not be: no non-alpha release exists to break

Status: open
Rests on: src/slots/CourseCatalogIntroSlot/index.tsx, src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableSlot/index.tsx, their README.md files, src/catalog/CatalogPage.tsx lines 113 and 123 at ead6afdfbd

Brian's direction (2026-10-30): catalog has not published a non-alpha version since the frontend-base port, so slot changes may break; anyone porting a plugin from the frontend-plugin-framework era already has changes to make, and more are documented rather than avoided. Checked: `@openedx/frontend-app-catalog` on npm has exactly `1.0.0-alpha.0` to `1.0.0-alpha.4`, `latest` is `alpha.4`, `package.json` says `0.0.0-dev`. The PR body lists two props as "deliberately not renamed here" for existing site plugins: `courseDataResultsLength` on `CourseCatalogIntroSlot` (fed by `catalogData?.results?.length`, passed on to the message as `resultsCount`) and `totalCourses` on `CourseCatalogDataTableSlot` (fed by `totalItems`). Both are from master; this PR renames their sources and stops at the slot boundary. The slot names themselves (`CourseCatalogIntroSlot`, `CourseCatalogDataTableSlot`, `CourseCatalogSearchFieldSlot`) also carry "Course" and are untouched. Review ask: rename the props with the rest (and say whether the slot names go too), and document the change for plugin authors. Candidate comment.

### 4. Catalog things still under a "course" name after this PR's rename

Status: open
Rests on: `find src -ipath '*course*'` and the exported-identifier grep at ead6afdfbd

Brian's direction (2026-10-30): the rename should reach everything that is a catalog thing under a course name, e.g. `CoursesList.tsx` → `CatalogList`. Enumerated at ead6afdfbd, outside `src/course-about/` which is genuinely one course.

Catalog things under a course name (rename candidates):
- `src/home/components/courses-list/CoursesList.tsx` and its slot `HomeCoursesListSlot` (id `...catalog.homeCoursesList.v1`): it calls `useCatalogListSearch` and renders one `HomeCourseCardSlot` per result, so it is the home page's catalog list and will be mixed once pathways render.
- The catalog page slots: `CourseCatalogIntroSlot`, `CourseCatalogSearchFieldSlot`, `CourseCatalogDataTableSlots/` with `CourseCatalogDataTableSlot`, `...CardViewSlot`, `...ControlBarSlot`, `...TableFooterSlot`, and their props and READMEs. (`CourseCatalogDataTableCourseCardSlot` and `HomeCourseCardSlot` are the course card itself; a pathway card is its own slot, so those keep "Course".)
- Inside the module this PR already renamed: `queryKey: ['courseListSearch', params]` in `hooks.ts` line 32 (unchanged from master, single use, no `invalidateQueries` on it, so harmless at runtime but missed by the rename) and the test file `__tests__/courseListSearch.test.tsx`.
- Header widget items `CoursesLinkMenuItem.jsx` and `ExploreCoursesLinkMenuItem.jsx`: they link to the catalog page; whether they rename depends on entry 5.
- Deferred by the PR on purpose: `CourseListSearchParams`, `CourseListSearchResponse` (to 175), `getCourseListSearchUrl` (to the endpoint cutover). Not part of this ask.

Genuinely about one course, stay: `src/course-about/*` and every `CourseAbout*Slot`, `generic/course-card` (`CourseCard`), `HomeCourseCardSlot`, `CourseCatalogDataTableCourseCardSlot`, `__mocks__/course.ts` and `courseAbout.ts`, `no-course-image.svg`, the `coursePrice` id.

Candidate comment: one list, with the course-card exceptions named so the author does not over-rename.

### 5. The catalog page's URL is `/catalog/courses`, role `coursesRole`, and UI text "Courses"

Status: open
Rests on: src/routes.tsx lines 22-30, src/constants (coursesRole), src/catalog/messages.ts line 11 at ead6afdfbd

The mixed catalog page keeps the path `courses` and the `coursesRole` route role; the header's "Courses" and "Explore courses" items and the page's "Courses" message point there. A route path is user-facing and linkable, unlike an identifier, so it is a separate decision from entry 4: does the mixed page stay at `/catalog/courses`, or move, and does the ADR or #169 say? Not checked yet. Question for the author rather than a rename ask.

### 6. Does any backend PR already fix the new endpoint's name? Is there an epic?

Status: resolved, no comment
Rests on: GitHub search on 2026-10-30 (PRs and code across openedx and open-craft; open PRs by rpenido and ChrisChV; open "pathway" PRs); openedx/openedx-search#20; open-craft/edx-search branch rpenido/catalog-pathway-search-results at f11b42d; openedx/openedx-platform#39204; open-craft/tutor-contrib-pathway-sandbox plugin.py

No. Nothing outside this PR's ADR writes `catalog_search` or `catalog_list_search` as an endpoint: code search hits are unrelated (enterprise catalog-search package, end-to-end-tests selectors, a learning course-exit component). The backend work that exists: rpenido's edx-search branch is one commit over upstream master, `feat: support typed search results via an optional document_type field` (engines carry a `document_type` through to `_type`; no URL change, no PR opened); openedx-platform#39204 adds learner pathway APIs and never mentions search; openedx-search#20 is the FC-0144 library ADR (schema, registration, adapter contract) and names no endpoint. The pathway sandbox plugin pins only frontend branches. So the ADR in #174 is the first and only written source of the name, and the review's naming decision (entry 2) sets it rather than following anything.

Checked again on Brian's challenge (2026-10-30). The epic is aximcollaborative/funded-contributions#175, "FC-0137 - Learning Pathways MVP Implementation": a link skeleton (project log sheet, Drive folder, Confluence page), its "Related PRs" list empty, no comments. The Confluence page returns only navigation without a login, so it is unread. Backend pathway PRs do exist, all drafts or design: openedx/openedx-core#820 (Agrendalath, Pathway content and catalog APIs, with ADR 0007 on the pathway-catalog-content split), openedx-core#764 (ADR, pathway credentials), openedx-core#918 (post_save on unenroll), openedx-core#496 (ormsbee, Unified Pathways v2, 2026-03), openedx/openedx-platform#39204 (rpenido, learner pathway APIs, depends on core#820; its issue is openedx-platform#39203), openedx-platform#39205 (the sandbox: five chore commits, no search or requirements files), and the Aspects sinks openedx/tutor-contrib-aspects#1384 and openedx/platform-plugin-aspects#274. None touches search: no `search` or `catalog` file in core#820 beyond the ADR, no endpoint name or `path('...search` in the diffs of core#820 or platform#39204, and the sandbox platform branch pins no edx-search change, so the sandbox runs the catalog stack against the legacy endpoint, which matches what #174 and #175 claim.

Carried to 175: the edx-search commit's `document_type` → `_type` mapping is the backend side of 175's `course | '_doc'` arm.
