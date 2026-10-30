# Review: openedx/frontend-app-catalog#175 — refactor: support mixed course and pathway search responses [FC-0137]

https://github.com/openedx/frontend-app-catalog/pull/175

The record of this review. The state is rewritten, never appended; the passes table and the ledger grow. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

## State

PR 2 of 5 in the split of openedx/frontend-app-catalog#169, stacked on #174 by content: the branch is #174's five commits plus e87d4fd (`refactor: support mixed course and pathway search responses`). The fork PR has to target `master`, so GitHub shows the cumulative diff; the review scope is the one commit, `git diff pr-174..pr-175` in this worktree. kdmccormick approved 2026-10-29 pending #174 and asked for a technical review of that last commit only. Waits on the #174 review.

## Passes

One row per pass. `bin/review sync` appends the row with the new head; scope (whole diff, named files or commits) and outcome (none, comments, approve, request changes) are filled in by hand. Since the last pass: `git diff <previous head>..<head>` in the code worktree, or `git range-diff` across a rebase.

| date | base | head | scope | outcome |
|------|------|------|-------|---------|
| 2026-10-30 | 586f5f6d7f | e87d4fd2d7 | | |

## Ledger

One entry per question, newest last: `### N. <question>`, a `Status:` line, a `Rests on:` line, then what was found, why no comment was needed, or what was posted. Status is one of: open; resolved, no comment; posted <thread url>; parked; stale. "Rests on" names the files and the head SHA the answer was reached at; a pass marks an entry stale when those files changed since.

### 1. Is the request unchanged against the legacy backend?

Status: resolved, no comment
Rests on: src/data/catalog-list-search/api.ts at e87d4fd2d7 (diff pr-174..pr-175)

Yes. The commit touches `api.ts` only in the import line, the `params` type annotation, the return type, and the final line (`camelCaseObject(data)` → `normalizeCatalogListSearchResponse(data)`). The URL is still `getCourseListSearchUrl()`, and the FormData assembly (page size and index coercion, `addFiltersToFormData`, sorting flag) is untouched.

### 2. The response normalizer is a behaviour change relative to master, and a fix

Status: open, to confirm with lodash once `npm ci` finishes
Rests on: src/data/catalog-list-search/api.ts (`normalizeCatalogListSearchResponse`), src/catalog/utils.ts (`transformAggregationsToFilterChoices`), frontend-base `runtime/utils.js` (`modifyObjectKeys`, `camelCaseObject`) at e87d4fd2d7

On master, `camelCaseObject(data)` runs lodash `camelCase` over every key at every depth (`modifyObjectKeys` recurses into object and array values), so the keys of `aggs.<facet>.terms` were rewritten too. `transformAggregationsToFilterChoices` then uses each term key as the filter `value` sent back to the backend verbatim. Any term key that `camelCase` alters (an org like `HarvardX`, a slug like `open-edx`) therefore produced a filter value the backend never matches. The new normalizer keeps `terms` and the new optional `labels` verbatim and camelCases everything else, with a test that pins both halves. So against the legacy backend this commit changes what the org filter sends for mixed-case orgs, and in the direction of working. The PR body says the keys "must be sent back verbatim" without saying master got this wrong. Candidate comment: name it as a fix of a master bug so the behaviour change is on the record, and ask for a sandbox check with a mixed-case org. To confirm: `camelCase('HarvardX')` and `camelCase('open-edx')` outputs with the installed lodash.

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
