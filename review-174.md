# Review: openedx/frontend-app-catalog#174 — refactor: rename course catalog data to catalog data [FC-0137]

https://github.com/openedx/frontend-app-catalog/pull/174

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

First of the 5-PR split of openedx/frontend-app-catalog#169 (rpenido, open-craft fork); #175 is stacked on this branch by content and the body says PRs 2 to 5 build on it. kdmccormick settled the ADR (requested changes 2026-10-28, approved 2026-10-29) and asked Brian for a technical pass on the code.

Brian's read after the first pass (2026-10-30): looking good overall. Two things posted: the endpoint name is written two ways and nothing outside this ADR has decided it, so the author is asked which; and the rename stops short (`CoursesList`, `CatalogListSearchHook.data`), with the principles that non-course-specific things do not get course names and that names fit from endpoint to component.

rpenido answered the same day (https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6529049813): the name is `catalog_search`/`catalogSearch`, renamed across the data layer in 767011e12e; `CoursesList` stays here because it renders course cards only, with `CatalogList` offered in #176 "if you think it is worth the churn". The PR body was rewritten for the new names (it now lists `CourseListSearchResponse` → `CatalogSearchResponse` and `CourseListSearchParams` → `CatalogSearchParams` as done here, not deferred). #175 was rebased onto it. Nothing else on the PR since.

Second pass (2026-11-02), head 767011e12e: the rename commit is mechanical (entry 2); the whole code diff against master, normalized for the body's rename mapping, leaves only the slot props the body keeps on purpose (entry 3), a six-line doc comment added on `displayData` in `CatalogPage.tsx` (entry 7), a test title still naming `totalCourses` (entry 8), and comment wording. The query key and the test file from entry 4 were renamed here. Open for Brian: whether `CatalogList` in #176 is an acceptable answer to item 2 (entry 4); whether to post the slot-props ask (entry 3); whether to raise the `/catalog/courses` route and `coursesRole` (entry 5); and the two nits (entries 7, 8). Suite at 767011e12e on node 24.22.1: `npm run lint` passes, `npm run test` passes (41 suites, 427 tests, 0 snapshots). The repo has no type-check script; CI runs lint, test, build, build:ci and i18n_extract, so `npm run build` is the type-bearing step and passes too (exit 0, no errors in the log). Nothing in the suite blocks.

## Passes

One row per pass. `bin/review sync` appends the row with the new head; scope (whole diff, named files or commits) and outcome (none, comments, approve, request changes) are filled in by hand. Since the last pass: `git diff <previous head>..<head>` in the code worktree, or `git range-diff` across a rebase.

| date | base | head | scope | outcome |
|------|------|------|-------|---------|
| 2026-10-30 | 586f5f6d7f | ead6afdfbd | ADR threads and history; endpoint name across app, ADR and backend; enumeration of course-named things; not the diff line by line | comments: one summary comment, two items |
| 2026-11-02 | 586f5f6d7f | 767011e12e | rename commit ead6afd..767011e; whole code diff against master, normalized for the rename mapping (residue read line by line); entry 3 and 5 sources; suite | none yet: findings in entries 4, 5, 7, 8 wait for Brian |

## Ledger

One entry per question, newest last: `### N. <question>`, a `Status:` line, a `Rests on:` line, then what was found, why no comment was needed, or what was posted. Status is one of: open; resolved, no comment; posted <thread url>; parked; stale. "Rests on" names the files and the head SHA the answer was reached at; a pass marks an entry stale when those files changed since.

### 1. Does anything in the app call the new endpoint, and is the ADR still Proposed?

Status: resolved, no comment
Rests on: docs/decisions/0003-use-a-generic-catalog-search-endpoint.rst, src/data/catalog-search/urls.ts, src/data/catalog-search/api.ts at 767011e12e (re-checked after the rename: the only `course_list_search` hits in src are the legacy URL in `urls.ts`; `getCatalogSearchUrl()` still returns it)

The ADR's Status section reads `Proposed`. Outside `docs/`, the only mention of `catalog_search`, `catalog_list_search` or `search/v1` is a code comment in `urls.ts`. The one search URL builder is `getCourseListSearchUrl()`, returning `/search/unstable/v0/course_list_search/`, called from `api.ts` line 48. No code path reaches the new endpoint.

### 2. The code comment and the PR body name the new endpoint `catalog_list_search`; the ADR names it `catalog_search`

Status: posted https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6524286800 (item 1, as a question: which name; edited 2026-10-30 13:56 to add that 175's `CatalogListSearchMixedResponse` could be `CatalogSearchResponse`, and so the recommended renames here would follow); answered and fixed in 767011e12e, nothing left to ask
Rests on: src/data/catalog-list-search/urls.ts lines 5-8 at ead6afdfbd; PR body "planned generic `catalog_list_search` endpoint"

The ADR said `catalog_list_search` in c6f24b2 and 8ee4ecb; 7fb99a9 (answering kdmccormick's thread on not keeping two endpoints) renamed it to `/search/v1/catalog_search/`. The `urls.ts` comment was written in the rename commit 26ba130 and not updated, and the PR body still carries the old name. From this change, not pre-existing; the fix is one word in the comment and one in the body. Resolution (767011e12e, read 2026-11-02): `catalog_list_search`/`catalogListSearch`/`CatalogListSearch` → `catalog_search`/`catalogSearch`/`CatalogSearch` across 33 files, 307 lines each way, plus the ADR's two "this repo" file paths. Diffed against ead6afdfbd with that mapping applied, the residue is four comment and README wordings ("course list search" → "catalog search") and the `urls.ts` comment now naming `catalog_search`; the test file is `__tests__/catalogSearch.test.tsx`. Nothing non-mechanical. The `CourseListSearch*` types went in the same commit, so `src` has no `CourseListSearch`, `CatalogListSearch`, `courseListSearch` or `catalogListSearch` left; the only `course_list_search` is the legacy URL. Brian's direction (2026-10-30): the review will ask for one name across the ADR's endpoint and the app's identifier family, and say which. Name families at ead6afdfbd: `catalog-list-search` / `CatalogListSearch` (this PR's renames, 21 and 14 files), `CourseListSearch` (the types deliberately left for the next PR, 13 files), `CatalogSearch` (5 files, all the pre-existing public slot `CourseCatalogSearchFieldSlot`, on master already and not part of this family), the ADR's endpoint `catalog_search` (0 files in src).

### 3. The slot props kept under their old names need not be: no non-alpha release exists to break

Status: parked: not named in the posted comment; the principle there ("if it isn't course-specific, it shouldn't have course-specific naming") covers the slot props, the explicit ask waits for Brian's word now that the name is settled. At 767011e12e both props are still kept and the body still lists them as "deliberately not renamed here ... so existing site plugins keep working"; `CourseCatalogIntroSlot` maps `courseDataResultsLength` onto `getPageTitle`'s renamed `resultsCount`, and the DataTable slot README documents `totalCourses` while its sibling text says "calculated from total courses"

Brian's pass 2026-11-02, from `CatalogPage.tsx`'s `CourseCatalog*Slot` imports: does a later PR drop "Course"? No. The changed-files lists of #169 and of #175, #176, #177 and #178 (`pulls/<n>/files`) show every `src/slots/CourseCatalog*` path as modified or added, none renamed, and no `CatalogIntroSlot`/`CatalogDataTableSlot` path appears. #177 adds the pathway card slot *under* the name: `CourseCatalogDataTableSlots/CourseCatalogDataTableCardViewSlot/CourseCatalogDataTablePathwayCardSlot`, props `CourseCatalogDataTablePathwayCardSlotProps`, id `org.openedx.frontend.slot.catalog.courseCatalogDataTablePathwayCard.v1` (read on open-craft branch `rpenido/fal-4374/explore-pathways`); the home one is `HomePathwayCardSlot`, id `...catalog.homePathwayCard.v1`. The seven existing ids at 767011e12e all carry `courseCatalog` (`courseCatalogIntro`, `courseCatalogSearchField`, `courseCatalogDataTable`, `...CardView`, `...CourseCard`, `...ControlBar`, `...TableFooter`) and `homeCoursesList`. So the slot-name decision is not deferred anywhere in the stack, and #177 would publish a pathway slot id with `courseCatalog` in it; it has to be raised here or on #177, not left.
Rests on: src/slots/CourseCatalogIntroSlot/index.tsx, src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableSlot/index.tsx, their README.md files, src/catalog/CatalogPage.tsx lines 113 and 123 at ead6afdfbd

Brian's direction (2026-10-30): catalog has not published a non-alpha version since the frontend-base port, so slot changes may break; anyone porting a plugin from the frontend-plugin-framework era already has changes to make, and more are documented rather than avoided. Checked: `@openedx/frontend-app-catalog` on npm has exactly `1.0.0-alpha.0` to `1.0.0-alpha.4`, `latest` is `alpha.4`, `package.json` says `0.0.0-dev`. The PR body lists two props as "deliberately not renamed here" for existing site plugins: `courseDataResultsLength` on `CourseCatalogIntroSlot` (fed by `catalogData?.results?.length`, passed on to the message as `resultsCount`) and `totalCourses` on `CourseCatalogDataTableSlot` (fed by `totalItems`). Both are from master; this PR renames their sources and stops at the slot boundary. The slot names themselves (`CourseCatalogIntroSlot`, `CourseCatalogDataTableSlot`, `CourseCatalogSearchFieldSlot`) also carry "Course" and are untouched. Review ask: rename the props with the rest (and say whether the slot names go too), and document the change for plugin authors. Candidate comment.

### 4. Catalog things still under a "course" name after this PR's rename

Status: posted https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6524286800 (item 2, as the two principles and the two examples: `CoursesList` destructuring `data` into `catalogData`, and `CatalogListSearchHook.data` typed `CourseListSearchResponse`; the full list here is for the next round); answered 2026-10-30: the hook typing is fixed in 767011e12e, `CoursesList` stays with `CatalogList` offered in #176; Brian has not said whether that answer closes item 2
Rests on: `find src -ipath '*course*'` and the exported-identifier grep at ead6afdfbd

Brian's direction (2026-10-30): the rename should reach everything that is a catalog thing under a course name, e.g. `CoursesList.tsx` → `CatalogList`. Enumerated at ead6afdfbd, outside `src/course-about/` which is genuinely one course.

Catalog things under a course name (rename candidates):
- `src/home/components/courses-list/CoursesList.tsx` and its slot `HomeCoursesListSlot` (id `...catalog.homeCoursesList.v1`): it calls `useCatalogListSearch` and renders one `HomeCourseCardSlot` per result, so it is the home page's catalog list and will be mixed once pathways render.
- The catalog page slots: `CourseCatalogIntroSlot`, `CourseCatalogSearchFieldSlot`, `CourseCatalogDataTableSlots/` with `CourseCatalogDataTableSlot`, `...CardViewSlot`, `...ControlBarSlot`, `...TableFooterSlot`, and their props and READMEs. (`CourseCatalogDataTableCourseCardSlot` and `HomeCourseCardSlot` are the course card itself; a pathway card is its own slot, so those keep "Course".)
- Inside the module this PR already renamed: `queryKey: ['courseListSearch', params]` in `hooks.ts` line 32 (unchanged from master, single use, no `invalidateQueries` on it, so harmless at runtime but missed by the rename; #175's commit e87d4fd renames it to `catalogListSearch`, so it is a layering nit here, not a gap in the stack) and the test file `__tests__/courseListSearch.test.tsx`.
- Header widget items `CoursesLinkMenuItem.jsx` and `ExploreCoursesLinkMenuItem.jsx`: they link to the catalog page; whether they rename depends on entry 5.
- Deferred by the PR on purpose: `CourseListSearchParams`, `CourseListSearchResponse` (to 175), `getCourseListSearchUrl` (to the endpoint cutover). Not part of this ask.

Genuinely about one course, stay: `src/course-about/*` and every `CourseAbout*Slot`, `generic/course-card` (`CourseCard`), `HomeCourseCardSlot`, `CourseCatalogDataTableCourseCardSlot`, `__mocks__/course.ts` and `courseAbout.ts`, `no-course-image.svg`, the `coursePrice` id.

Candidate comment: one list, with the course-card exceptions named so the author does not over-rename.

At 767011e12e: done here are the query key (`['catalogSearch', params]`), the test file (`catalogSearch.test.tsx`) and the `CourseListSearch*` types, so the "inside the module" and "deferred" bullets above are closed. Still under a course name: `CoursesList`/`HomeCoursesListSlot` (author's answer: #176), the catalog page slots and their props (entry 3), the header items (entry 5). The rename also took `setPreviousCourseData` → `setPreviousCatalogData`, which the body does not list; consistent, no comment.

### 5. The catalog page's URL is `/catalog/courses`, role `coursesRole`, and UI text "Courses"

Status: open, not posted; checked 2026-11-02, question for the author or product, Brian's call whether to raise it here
Rests on: src/routes.tsx lines 22-30, src/constants.ts line 3, src/widgets/CatalogHeader/DiscoverLinkMenuItem.jsx and ExploreCoursesLinkMenuItem.jsx line 12, src/home/components/home-banner/HomeBanner.tsx line 22, src/home/components/courses-list/CoursesList.tsx line 41, docs/decisions/0003-use-a-generic-catalog-search-endpoint.rst, #169 body at 767011e12e

The mixed catalog page keeps the path `courses` and the `coursesRole` route role; the header's "Courses" and "Explore courses" items and the page's "Courses" message point there. A route path is user-facing and linkable, unlike an identifier, so it is a separate decision from entry 4: does the mixed page stay at `/catalog/courses`, or move, and does the ADR or #169 say? Checked at 767011e12e: the route is `path: 'courses'` under `/catalog` with role `coursesRole` = `org.openedx.frontend.role.courses`; that role is resolved by `getUrlByRouteRole(coursesRole)` in `CoursesList`, `HomeBanner`, `DiscoverLinkMenuItem` and `ExploreCoursesLinkMenuItem`, so the role id is a public contract like a slot id, not an internal name. The ADR says nothing about the page URL or the role (its "route" hits are the API URL only) and the #169 body mentions only `/catalog`. Nothing in the stack decides it. Question for the author rather than a rename ask; a role rename would be a contract change on top of the slot-props question in entry 3.

### 6. Does any backend PR already fix the new endpoint's name? Is there an epic?

Status: resolved, no comment
Rests on: GitHub search on 2026-10-30 (PRs and code across openedx and open-craft; open PRs by rpenido and ChrisChV; open "pathway" PRs); openedx/openedx-search#20; open-craft/edx-search branch rpenido/catalog-pathway-search-results at f11b42d; openedx/openedx-platform#39204; open-craft/tutor-contrib-pathway-sandbox plugin.py

No. Nothing outside this PR's ADR writes `catalog_search` or `catalog_list_search` as an endpoint: code search hits are unrelated (enterprise catalog-search package, end-to-end-tests selectors, a learning course-exit component). The backend work that exists: rpenido's edx-search branch is one commit over upstream master, `feat: support typed search results via an optional document_type field` (engines carry a `document_type` through to `_type`; no URL change, no PR opened); openedx-platform#39204 adds learner pathway APIs and never mentions search; openedx-search#20 is the FC-0144 library ADR (schema, registration, adapter contract) and names no endpoint. The pathway sandbox plugin pins only frontend branches. So the ADR in #174 is the first and only written source of the name, and the review's naming decision (entry 2) sets it rather than following anything.

Checked again on Brian's challenge (2026-10-30). The epic is aximcollaborative/funded-contributions#175, "FC-0137 - Learning Pathways MVP Implementation": a link skeleton (project log sheet, Drive folder, Confluence page), its "Related PRs" list empty, no comments. The Confluence page returns only navigation without a login, so it is unread. Backend pathway PRs do exist, all drafts or design: openedx/openedx-core#820 (Agrendalath, Pathway content and catalog APIs, with ADR 0007 on the pathway-catalog-content split), openedx-core#764 (ADR, pathway credentials), openedx-core#918 (post_save on unenroll), openedx-core#496 (ormsbee, Unified Pathways v2, 2026-03), openedx/openedx-platform#39204 (rpenido, learner pathway APIs, depends on core#820; its issue is openedx-platform#39203), openedx-platform#39205 (the sandbox: five chore commits, no search or requirements files), and the Aspects sinks openedx/tutor-contrib-aspects#1384 and openedx/platform-plugin-aspects#274. None touches search: no `search` or `catalog` file in core#820 beyond the ADR, no endpoint name or `path('...search` in the diffs of core#820 or platform#39204, and the sandbox platform branch pins no edx-search change, so the sandbox runs the catalog stack against the legacy endpoint, which matches what #174 and #175 claim.

Carried to 175: the edx-search commit's `document_type` → `_type` mapping is the backend side of 175's `course | '_doc'` arm.

### 7. `CatalogPage.tsx` gains a six-line doc comment on `displayData` that the body does not mention

Status: open: candidate nit, Brian's call
Rests on: src/catalog/CatalogPage.tsx lines 52-57 at 767011e12e; added in 26ba130

The only non-rename code change in the whole diff: a `/** Determines which data to display ... */` block above the `displayData` `useMemo`. It is accurate (previous data is shown when there is an active search with no results and cached data exists) and says nothing the three lines below it do not. The body calls the PR "mostly `git mv` plus identifier renames" and lists no comment additions. From this change. Fix is deleting six lines or one sentence in the body. Candidate: "just curious" one-liner, or let it go.

### 8. A `CatalogPage.test.tsx` title still says `totalCourses` after the page local became `totalItems`

Status: open: nit, Brian's call
Rests on: src/catalog/CatalogPage.test.tsx line 1193 at 767011e12e

`it('should calculate pageCount as 0 when both total and totalCourses are 0')` named the page local on master; the PR renamed the local to `totalItems` and left the title, which now reads as the slot prop of the same name. The test renders the page with `results: []`, `total: 0` and asserts the empty-state message and no pager, so the title is a stale name only. Fix is one word; a `suggestion` block if posted.

### 9. `CourseCatalogDataTableSlotProps.displayData` changes type name from `CourseListSearchResponse` to `CatalogSearchResponse`: does that break an operator plugin's type check, and would an alias help?

Status: open: Brian's question 2026-11-02; mechanism and options recorded, no comment drafted; the wider question (apps do not export the types their slot props are built from, though the READMEs document them) is openedx/frontend-base#339, opened 2026-11-02 from `issue-body-slot-props-types.md`, left open for discussion with Brian's lean stated
Rests on: src/index.ts, package.json `exports`, src/slots/CourseCatalogDataTableSlots/CourseCatalogDataTableSlot/{index.tsx,README.md}, node_modules/@openedx/frontend-base/dist/tools/typescript/tsconfig.json at 767011e12e; `npm view @openedx/frontend-app-catalog@1.0.0-alpha.4 exports`; `npm pack --dry-run` of alpha.4

What a plugin can reach by name. `src/index.ts` on master and at head exports the app, the routes and the `*SlotProps` types only; `CourseListSearchResponse` was never exported there and `CatalogSearchResponse` is not now. `package.json` `exports` is `{".": "./dist/index.js"}` in the repo and in every published alpha (alpha.4 checked), and the frontend-base tsconfig every site extends sets `moduleResolution: "bundler"`, which enforces the exports map, so a deep import such as `@openedx/frontend-app-catalog/dist/data/course-list-search/types` does not resolve even though the tarball ships those `.d.ts` files. The only supported way to name the response type from outside is `CourseCatalogDataTableSlotProps['displayData']`, and the READMEs' examples import `CourseCatalogDataTableSlotProps` from `./src`, the in-repo site config pattern, and annotate the whole props object. Under that pattern the rename is invisible: the props type name is unchanged and the shape is identical (the data-layer rename is `git mv` plus identifiers; residue in entry 2 is comment text).

What does break. A site config living inside a clone of this repo that imports `CourseListSearchResponse` from `@src/data/course-list-search/types` (the READMEs' own examples use `@src/...` for `DEFAULT_PAGE_SIZE`, so that pattern is documented by example). It breaks twice: the directory is gone and the name is gone. A type alias at the new path fixes neither for that importer; only a shim file at the old path would, and deleting that directory is the PR.

Options:
- Nothing in code; one bullet in the body saying the exported surface (`src/index.ts`) does not change and `CourseCatalogDataTableSlotProps` keeps its name and shape, so plugins typed the documented way are unaffected. Pairs with the alpha-only-release fact in entry 3.
- Export the response type from `src/index.ts` now, with `/** @deprecated */ export type CourseListSearchResponse = CatalogSearchResponse;` beside it. Two lines; gives plugins a supported name for the first time. Against it: it makes the response shape public API one PR before #175 changes it (the mixed union), so the alias would protect a name whose shape is about to move anyway, and a deprecated alias for a name that was never exported deprecates nothing.
- Old-path shim (`src/data/course-list-search/types.ts` re-exporting). Keeps an internal path alive that the exports map never exposed; against the PR's purpose. Not recommended.
