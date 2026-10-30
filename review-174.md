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
