# Review: openedx/frontend-app-catalog#175 — refactor: support mixed course and pathway search responses [FC-0137]

https://github.com/openedx/frontend-app-catalog/pull/175

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

PR 2 of 5 in the split of openedx/frontend-app-catalog#169, stacked on #174 by content: the branch is #174's five commits plus e87d4fd. The fork PR has to target `master`, so GitHub shows the cumulative diff; the review scope is the one commit, `git diff pr-174..pr-175` in this worktree. kdmccormick approved 2026-10-29 pending #174 and asked for a technical review of that last commit only.

2026-10-30: Claude read the commit line by line (entries 1 to 6); Brian has not done his own pass yet. Brian noticed one name thing, `CatalogListSearchMixedResponse`, and put it in the 174 comment's edit rather than here. Nothing posted on 175. Open from Claude's read: the normalizer is a fix of a master bug and the body does not say so (entry 2, candidate comment); the suite has not been run. Waits on the #174 review and the endpoint-name answer.

2026-10-31: the endpoint name is answered on #174 (`catalog_search`, rename commit 767011e12e). #175 was rebased onto it: head 089a0cda88, the one commit re-created on top of the rename; not re-read since, so entries 1 to 7 rest on e87d4fd2d7.

2026-11-06: Brian started his own pass from the bottom of the branch diff (`CoursesList.tsx`). First decision (entry 8): the home list dispatches on `type` with a `switch`, `pathway` rendering nothing in this PR, `course` and `default` rendering the course card; the `!== 'pathway'` guard goes, and #176 and #177 are expected to fill the `pathway` case rather than keep their ternaries. Nothing drafted for the PR yet; entries 2 and 7 still open.

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
- The query key becomes `catalogListSearch` here rather than in #174 (noted on 174's entry 4).

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
