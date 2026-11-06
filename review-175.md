# Review: openedx/frontend-app-catalog#175 — refactor: support mixed course and pathway search responses [FC-0137]

https://github.com/openedx/frontend-app-catalog/pull/175

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

PR 2 of 5 in the split of openedx/frontend-app-catalog#169, stacked on #174 by content: the branch is #174's five commits plus e87d4fd. The fork PR has to target `master`, so GitHub shows the cumulative diff; the review scope is the one commit, `git diff pr-174..pr-175` in this worktree. kdmccormick approved 2026-10-29 pending #174 and asked for a technical review of that last commit only.

2026-10-30: Claude read the commit line by line (entries 1 to 6); Brian has not done his own pass yet. Brian noticed one name thing, `CatalogListSearchMixedResponse`, and put it in the 174 comment's edit rather than here. Nothing posted on 175. Open from Claude's read: the normalizer is a fix of a master bug and the body does not say so (entry 2, candidate comment); the suite has not been run. Waits on the #174 review and the endpoint-name answer.

2026-10-31: the endpoint name is answered on #174 (`catalog_search`, rename commit 767011e12e). #175 was rebased onto it: head 089a0cda88, the one commit re-created on top of the rename; not re-read since, so entries 1 to 7 rest on e87d4fd2d7.

2026-11-06: Brian started his own pass from the bottom of the branch diff (`CoursesList.tsx`). Two decisions so far: the home list dispatches on `type` with a `switch`, `pathway` rendering nothing in this PR, `course` and `default` rendering the course card, so the `isCourseResult` guard and the `CourseResult` extract go from the component (entry 8); and the union members get names in `types.ts` with the mock exporting `mockCourseResults` typed as the course member, so the two test files iterate typed rows instead of filtering (entry 9). Both comments name the shape #176 and #177 then take. Nothing drafted for the PR yet; entries 2 and 7 still open, the rest of Brian's pass up the diff not started.

## Passes

One row per pass. `bin/review sync` appends the row with the new head; scope (whole diff, named files or commits) and outcome (none, comments, approve, request changes) are filled in by hand. Since the last pass: `git diff <previous head>..<head>` in the code worktree, or `git range-diff` across a rebase.

| date | base | head | scope | outcome |
|------|------|------|-------|---------|
| 2026-10-30 | 586f5f6d7f | e87d4fd2d7 | the one commit, line by line (`git diff pr-174..pr-175`), plus the legacy engines' `_type` and frontend-base's `camelCaseObject`; suite not run (permission refused for code from the PR checkout) | none yet |

## Ledger

One entry per question, newest last: `### N. <question>`, a `Status:` line, a `Rests on:` line, then what was found, why no comment was needed, or what was posted. Status is one of: open; resolved, no comment; posted <thread url>; parked; stale. "Rests on" names the files and the head SHA the answer was reached at; a pass marks an entry stale when those files changed since.

### 1. Is the request unchanged against the legacy backend?

Status: resolved, no comment
Rests on: src/data/catalog-list-search/api.ts at e87d4fd2d7 (diff pr-174..pr-175)

Yes. The commit touches `api.ts` only in the import line, the `params` type annotation, the return type, and the final line (`camelCaseObject(data)` → `normalizeCatalogListSearchResponse(data)`). The URL is still `getCourseListSearchUrl()`, and the FormData assembly (page size and index coercion, `addFiltersToFormData`, sorting flag) is untouched.

### 2. The response normalizer is a behaviour change relative to master, and a fix

Status: open; the lodash behaviour rests on its documented cases (`_.camelCase('--foo-bar--')` → `fooBar`, `__FOO_BAR__` → `fooBar`, so `open-edx` → `openEdx` and a leading `_` is stripped), not on a run: executing code from the PR checkout was refused by the session's permission classifier on 2026-10-30
Rests on: src/data/catalog-list-search/api.ts (`normalizeCatalogListSearchResponse`), src/catalog/utils.ts (`transformAggregationsToFilterChoices`), frontend-base `runtime/utils.js` (`modifyObjectKeys`, `camelCaseObject`) at e87d4fd2d7

On master, `camelCaseObject(data)` runs lodash `camelCase` over every key at every depth (`modifyObjectKeys` recurses into object and array values), so the keys of `aggs.<facet>.terms` were rewritten too. `transformAggregationsToFilterChoices` then uses each term key as the filter `value` sent back to the backend verbatim. Any term key that `camelCase` alters (an org like `HarvardX`, a slug like `open-edx`) therefore produced a filter value the backend never matches. The new normalizer keeps `terms` and the new optional `labels` verbatim and camelCases everything else, with a test that pins both halves. So against the legacy backend this commit changes what the org filter sends for mixed-case orgs, and in the direction of working. The PR body says the keys "must be sent back verbatim" without saying master got this wrong. Candidate comment: name it as a fix of a master bug so the behaviour change is on the record, and ask for a sandbox check with a mixed-case org. `HarvardX` → `harvardX` follows from lodash's word split on case boundaries; not executed here.

### 3. What `type` is on a legacy result, and does the course arm catch it?

Status: resolved, no comment
Rests on: openedx/edx-search master `src/search/elastic.py`, `meilisearch.py`, `typesense.py` (each emits `'_type': '_doc'` in its result translation); src/__mocks__/catalogListSearch.ts (`type: '_doc'`); src/home/components/courses-list/CoursesList.tsx at e87d4fd2d7

All three upstream engines put `_type: '_doc'` on every result, and the app's mock agrees. After camelCasing the key is `type`, so legacy results are `type: '_doc'`, which is the `'course' | '_doc'` arm of `CatalogListSearchMixedResult`. The home list's guard is `result.type !== 'pathway'`, so it keeps every legacy row; nothing is filtered out against today's backend. The catalog page does not filter at all in this commit (its card view renders `displayData.results` as before).

### 4. `CourseData` replaces the inline result type without changing a field

Status: resolved, no comment
Rests on: src/data/catalog-list-search/types.ts, src/generic/course-card/types.ts at e87d4fd2d7

The inline `results[].data` type on master and `CourseData` have the same thirteen members with the same optionality (`id`, `course`, `start`, `imageUrl`, `org`, `orgImageUrl?`, `advertisedStart?`, `content.{displayName, overview?, number?}`, `number`, `modes`, `language`, `catalogVisibility`). Types only.

### 5. Small things, held

Status: parked
Rests on: e87d4fd2d7

- `normalizeCatalogListSearchResponse(data: any)`: `any` at the HTTP boundary where `unknown` plus the narrowing the function already does would type the same code. Nit.
- `CatalogPage.test.tsx` asserts `courseCards.length` against `mockCatalogListSearchResponse.results.length` and then iterates `courseResults`; equal only while the mock has no pathway row. The first mock pathway breaks that assertion before anything else. Nit for the PR that adds one.
- `src/generic/pathway-card/types.ts` is types only, nothing imports `PathwayCardProps` or `Pathway` yet; the body says the card lands next.
- The query key becomes `catalogListSearch` here rather than in #174 (noted on 174's entry 4). Closed by the rebase: 174 renamed it.
- Rebase artifact at 089a0cda88: `catalogSearch.test.tsx` titles read `Course List Search Data Layer` and `should fetch course list search data ...` again, where 767011e12e had `Catalog Search ...`; the rebased commit carried the pre-rename titles over. Nit.

### 6. Naming: `CatalogListSearchMixedResponse`

Status: posted https://github.com/openedx/frontend-app-catalog/pull/174#issuecomment-6524286800 (as the edit on the 174 comment: `CatalogSearchResponse` suggested, tied to the endpoint-name question)
Rests on: src/data/catalog-list-search/types.ts at e87d4fd2d7

### 7. The response type's shape changes here, and it is what `CourseCatalogDataTableSlotProps.displayData` exposes to plugins

Status: open: carried from the #174 review (its entry 9) on Brian's word 2026-11-02; to be worked out on the re-read of the rebased commit; the convention question behind it is openedx/frontend-base#339 (whether apps export the types their slot props are built from, and what an incompatible change to one means under ADR 0009), open for discussion
Rests on: #174 at 767011e12e (src/index.ts, package.json `exports`); this PR's types change at e87d4fd2d7, not re-read at 089a0cda88

In #174 the `displayData` type on `CourseCatalogDataTableSlotProps` only changes name (`CourseListSearchResponse` → `CatalogSearchResponse`), with an identical shape, and no data-layer type is exported from `src/index.ts` or reachable through the `exports` map, so a plugin typed through the slot props sees nothing. This PR is where the shape itself moves: `results[]` becomes the mixed union, so a plugin that reads `displayData.results[i].data` as a course through `CourseCatalogDataTableSlotProps['displayData']` gets a union it must narrow, and its type check fails with no name having changed at all. That is the backwards-compatibility question #174 does not have. To settle on the re-read: what exactly a plugin typed from the slot props loses when the union lands (which member accesses stop compiling); whether the slot prop keeps the mixed type or the slot narrows for its consumers; which path a slot API change takes here, since slot props are the slot's API (a changed prop type is a changed contract, the same as a removed `pluginProp`): a `v2` slot nesting the `v1` for a release, or the change documented for plugin authors; and whether the alpha-only-release argument from #174 entry 3 is enough to just document it in the body and the slot READMEs.

### 8. The home list tells courses from pathways by `type !== 'pathway'`, and `_doc` is a legacy value

Status: decided (Brian, 2026-11-06), nothing drafted: ask for a `switch` on `result.type` in `CoursesList`, with `case 'pathway'` rendering nothing in this PR and `case 'course'` plus `default` rendering `HomeCourseCardSlot`; the `isCourseResult` filter goes. #176 and #177 then fill the `pathway` case instead of their `=== 'pathway'` ternaries
Rests on: src/home/components/courses-list/CoursesList.tsx, src/data/catalog-search/types.ts, src/data/catalog-search/api.ts at 089a0cda88; #176 at 4b64b89 (`CoursesList.tsx` ternary), #177 at 69be64c (`CourseCatalogDataTableCardViewSlot/index.tsx`, `CourseCatalogDataTableResultCard` ternary); docs/decisions/0003 "Response envelope" and "Frontend cutover"

How `type` is used across the stack, checked 2026-11-06. Every edx-search engine emits `_type: '_doc'` on each hit (entry 3), camelCased to `type`, so every legacy result is `type: '_doc'`; the ADR's new endpoint emits `type` as `course` or `pathway` and omits `_type`, and its "Frontend cutover" section names the `'_doc'` union arm the "`_doc` compatibility arm" and removes it with the URL switch. Nothing in the stack ever tests for `'course'` or `'_doc'`: this PR filters the home list with `isCourseResult`, defined as `result.type !== 'pathway'`; #176 drops the filter for a ternary, `type === 'pathway'` to `HomePathwayCardSlot`, else `HomeCourseCardSlot`; #177 adds the same ternary in `CourseCatalogDataTableResultCard` for the catalog page's card view. So `type` never filters in the finished stack, it picks the card, and the `'course' | '_doc'` arm exists only so `!== 'pathway'` narrows to a course. No backend emits `'pathway'` today: the only `type: 'pathway'` in the stack is the mock #176 adds, and openedx-platform#39205 is a sandbox that builds the MFE forks (its tutor plugin, open-craft/tutor-contrib-pathway-sandbox, has no backend code). So the filter here is a no-op on a real site and the pathway branches in #176 and #177 are unreachable until the cutover.

Brian's read: the negative guard carries an unstated choice, an unknown type renders as a course, and #176's ternary keeps it. The explicit shape is a `switch` with the choice written down: `pathway` is its own case (nothing here, the pathway card from #176 on), `course` and `default` render the course card, so `_doc` falls through `default` and leaves with the ADR's cutover without a union arm being read anywhere. In `default` TypeScript narrows `result` to the `'course' | '_doc'` arm, so the course card's `original` prop types without the `CourseResult` extract. Not asked: mapping `_doc` to `'course'` in the normalizer (noted 2026-11-06 as the alternative place for the leak to stop); with the `switch` defaulting to course, nothing reads `_doc`, so the arm's removal is a types-only change at cutover.

### 9. The `isCourseResult` guard is repeated in two test files, and the one shared mock is what makes it necessary

Status: decided (Brian, 2026-11-06), nothing drafted: ask for the three bullets below as one change: named union members in `types.ts`, `mockCourseResults` typed as the course member with `mockCatalogSearchResponse` wrapping it, and the tests iterating the typed rows with the `CourseResult`/`isCourseResult`/`courseResults` blocks removed from both test files. The comment says the shape #176 then takes (`mockPathwayResults` and a mixed response added beside, course-only tests untouched) so the stack follows it. Brian's read 2026-11-06, confirmed below: the home-page and test changes are there to keep the course-specific tests compiling
Rests on: src/__mocks__/catalogSearch.ts, src/catalog/CatalogPage.test.tsx lines 39-45, src/home/HomePage.test.tsx lines 36-42, src/home/components/courses-list/CoursesList.test.tsx at 089a0cda88; #176 commits 81e06ea and 4b64b89

What the guard does at 089a0cda88. The mock has three `_doc` rows and no pathway, so `filter(isCourseResult)` in the two test files and in `CoursesList` removes nothing at runtime. It is there because this commit annotates the mock as `CatalogSearchResponse`, which makes every `results[i].data` the `CourseData | PathwayData` union; reads of course-only fields (`number`, `course`) stop compiling, so `CatalogPage.test.tsx` and `HomePage.test.tsx` each define `CourseResult` with `Extract` plus the guard, and filter the mock into `courseResults` before their per-card loops. Fields both arms share (`content.displayName`, `org`, `imageUrl`, `advertisedStart`) still compile, which is why `CoursesList.test.tsx` needed no guard. The `CourseResult` type is defined three times (component, two tests), and #176 redefines it a fourth way (an intersection) in `HomePage.test.tsx`.

The churn, already in #176. 81e06ea adds two `pathway` rows and a `category` facet to the same `mockCatalogSearchResponse`, so `total` goes 3 to 5, `org` term counts change, three `Showing 1 - 3` assertions in `CatalogPage.test.tsx` become `1 - 5`, and `HomePage.test.tsx` grows `isPathwayResult`/`pathwayResults` and rewrites its per-card loops to branch on `item.type`; 4b64b89 then removes the `category` facet again. One fixture edited three times across two PRs, every consumer re-asserted each time.

Solution space (Brian's direction: tests say "courses only" up front instead of filtering after):
- The mock module exports the rows by type: `mockCourseResults`, typed as the course member of the union, and `mockCatalogSearchResponse` is the envelope with `results: mockCourseResults`. Course tests iterate `mockCourseResults` and read course fields with no guard and no `Extract`. When pathway cards land, `mockPathwayResults` and a mixed response are added beside it, and course-only assertions do not move.
- The union's members get names in `types.ts` (`CourseSearchResult`, `PathwaySearchResult`, union composed from them) so nothing re-derives them with `Extract`; the slot-prop exports from 174's entry 9 would carry them.
- With entry 8's `switch`, the component's filter is gone already, so the guard survives only in tests, and the mock split removes it there.

### 10. `/** Future category badge fields. */` on `PathwayCardProps` and `PathwayData`, and the fields' optionality against the ADR

Status: open: Brian's eye 2026-11-06; findings and solution space below, nothing decided
Rests on: src/generic/pathway-card/types.ts, src/data/catalog-search/types.ts at 089a0cda88; docs/decisions/0003 "Category registry" and "Payloads"; #176 commit 81e06ea (`src/generic/pathway-card/index.tsx` lines 25-72, `src/slots/HomePathwayCardSlot/index.tsx` lines 15-40)

The comment sits twice in the file, over `category`, `categoryLabel`, `categoryBackgroundColor`, `categoryTextColor` in both `PathwayCardProps` and `PathwayData`. In this PR nothing reads any of them: `PathwayData` is imported only by the union in `catalog-search/types.ts`, and `PathwayCardProps` and `Pathway` have no importer (entry 5). "Future" is one commit away: 81e06ea, the first commit of #176, destructures all four in `PathwayCard`, gates the colors on `isValidCssColor`, renders `categoryLabel` as the badge, and `HomePathwayCardSlot` maps the four from `data` into the card props. The comment is never removed: it is still there, both copies, at the heads of #176, #177 and #178. So it is true for the life of this PR and false from the next one on, and the stack leaves it false.

Optionality disagrees with the ADR. "Payloads": minimum pathway data is `org`, `item_count`, `category`, `category_label`, `content.display_name`; the color pair, `image_url`, `start`, `advertised_start` are optional. "Category registry": "Pathway `data` includes required `category` and `category_label` and optional `category_background_color`/`category_text_color`." `PathwayData` makes all four category fields optional and `org`, `itemCount`, `content` required, so the required half of the category contract is missing from the type the app will narrow on; #176's card then treats `categoryLabel` as possibly empty (`(categoryLabel || '').trim()`), which the ADR says cannot happen. The `Pathway` interface (`id`, `index?`, `type?: string`, `data`) restates the union's pathway member with `type` loosened to any string; once entry 9 names `PathwaySearchResult` it is a duplicate.

Cross-link: the same color pair, admin-set with no accessibility guard, is the open question on openedx/frontend-app-learner-dashboard#879 (its entry 4, thread discussion_r4432047461); the catalog's `PathwayCard` in #176 carries the same `isValidCssColor` pattern as that PR's `CategoryBadge`. Not this PR's question, but the answer there shapes what the catalog card does with the colors.

Solution space:
- The comment goes, or says the external fact instead: the fields are the ADR's registry-enriched pathway payload (section "Category registry"), which is what the code cannot show. "Future" is not a fact about the field, it is a fact about the stack's ordering.
- `category` and `categoryLabel` required, the colors optional, matching the ADR, so the card's empty-label branch in #176 has nothing to guard.
- `Pathway` dropped in favour of the named union member from entry 9; `PathwayCardProps` either stays as the card's prop type ahead of #176 or moves there with the card (it is the only one of the three with no reader in this PR and no part in the data layer).
