---
name: upstream-issue
description: "Export a local ticket, wayfinder resolution or conversation as a project-repo GitHub issue, gated on Brian's approval at each step."
disable-model-invocation: true
---

# upstream-issue

Takes planning from the bairf effort worktree to a GitHub issue on the project repo, one gate at a time. Each step ends when Brian says so; nothing advances on its own.

The worktree: `bin/effort path <kind>/<name>` for the branch named in the repo's `CLAUDE.local.md`. State lives in `<worktree>/UPSTREAM.md`, one row per export:

```
| slug | body file | upstream | status |
|------|-----------|----------|--------|
| sequence-due-date-timezone | issue-body-sequence-due-date-timezone.md | openedx/frontend-app-learning#2149 | settled |
```

`status` is one of `unpublished` (body written, issue not yet created), `in-review` (created, body still moving), `settled` (body has stopped moving; eligible for a plan).

## 1. Draft

Input: a resolved wayfinder ticket, a `tickets/NN-*.md` file, or the conversation.

Write `<worktree>/issue-body-<slug>.md` in the new-issue shape from `openedx/github-bodies.md`: dense summary, disclosure note, plan in `<details>`, process noise stripped, no scratch file names or local paths. Add the `UPSTREAM.md` row with `status: unpublished`; on the source ticket (wayfinder or `tickets/`), add `Upstream: unpublished <body file>` under its `Status:` line. Commit the worktree.

Show Brian the body. Stop.

## 2. Create

On Brian's word only. One `gh issue create --body-file` against the project repo, with epic linking as `github-bodies.md` describes (a sub-issue of the epic only when the work blocks the epic). Record the `owner/repo#N` in the row, under `issues:` in `<worktree>/TAG.md`, and on the source ticket's `Upstream:` line as `<owner/repo#N> (in review)` in place of the body-file pointer; set `status: in-review`, commit. Stop.

## 3. Review

Brian's comments arrive from GitHub or chat. Apply each as an edit to the body file, PATCH the issue from it (`jq -n --rawfile body <file> '{body:$body}' | gh api --method PATCH repos/<owner>/<repo>/issues/<n> --input -`), commit. A confirmation is a clause on the existing bullet. Replies on the thread are Brian's. Stop after each round.

## 4. Settle

When Brian says the upstream issue is good: set `status: settled` in the row and drop `(in review)` from the ticket's `Upstream:` line, so a bare reference means settled; commit. The issue is now eligible for a `plan-<n>.md` and implementation. Nothing else happens in this step.
