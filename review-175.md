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
