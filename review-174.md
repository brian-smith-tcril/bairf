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
