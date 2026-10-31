# bairf

Brian's Claude Code setup and project working docs.

- `main` is the setup: the user-level `CLAUDE.md`, reference docs, hooks, skills, and the scripts that install them. Point a new machine at this branch.
- Every other branch is an **effort**: a `project/<name>`, `task/<name>`, `sidequest/<name>` or `review/<name>` holding that effort's plans, decisions, manual-testing records and body drafts, checked out as a worktree beside the code it serves. A finished effort is a `<kind>-archive/<name>` tag.

## Set up a machine (agent-run)

Exactly one checkout is the installed one; `~/.claude/bairf-root` names it.

1. Clone it anywhere and run `./setup.sh --check` from it.
2. Show the report. Every row is `ok`, `missing`, or a conflict that needs a hand merge (an existing `~/.claude/CLAUDE.md` with other content, a pointer at another checkout).
3. On Brian's word, `./setup.sh --apply`, then `--check` again until every row is `ok`.

What it installs, all derived from the pointer, no symlinks:

| Item | Expected state |
|---|---|
| `~/.claude/bairf-root` | this checkout's path |
| `~/.claude/CLAUDE.md` | one line: `@<root>/claude/CLAUDE.md` |
| global git ignore | `CLAUDE.local.md`, `**/.claude/settings.local.json` |
| `~/.claude/settings.json` | plugins and hooks from `claude/settings.fragment.json` merged in |
| `~/.claude/skills/*` | copies of `skills/*`; re-run to refresh |
| plugins, tools | `mattpocock-skills`; the official `gh-stack` extension and skill (`gh skill install github/gh-stack --agent claude-code --scope user --all`); nvm |

After a `git pull` on main, re-run `--check`; anything but the skill copies takes effect at the next session without it.

## Layout

```
claude/CLAUDE.md             user-level rules; points at the docs below
claude/settings.fragment.json
openedx/GLOSSARY.md          ecosystem vocabulary
openedx/*.md                 ADR policy, stacked PRs, GitHub bodies, frontend-app code, tutor dev
openedx/repos/<repo>/        README.md: facts about one repo that outlive any effort; GLOSSARY.md: its terms
agents/issue-tracker.md      what mattpocock's skills read as "the issue tracker"
agents/domain.md             what they read as the domain docs
hooks/no-scratch-refs.sh     blocks a GitHub write whose body names scratch files, bairf, or local paths
hooks/test-no-scratch-refs.sh
hooks/no-tmp-push.sh         blocks git push / gh pr create / gh stack submit from a clone under /tmp
hooks/test-no-tmp-push.sh
skills/upstream-issue        gated export of a local ticket to a project-repo issue
bin/effort                   effort branch lifecycle (project, task, sidequest, review)
bin/review                   reviewing someone else's PR: hub clone, PR worktree, review effort
setup.sh
```

## Efforts

```
bin/effort start <kind> <name> [dir]   orphan branch <kind>/<name> + worktree, default dir <parent of root>/bairf-<name>
bin/effort path <kind>/<name>          the worktree path
bin/effort list                        live effort branches and archived tags
bin/effort close <kind>/<name>         annotated tag <kind>-archive/<name> from TAG.md, delete the branch, remove the worktree
```

Kinds: a **project** is a multi-session effort against one or more code repos, an epic's worth. A **task** is work that would make sense as one issue or PR: a bug fix, a one-commit feature. A **sidequest** is for Brian: exploring an idea, investigating something with no commitment to act on the findings, or this repo's own setup. A **review** is Brian reviewing someone else's PR; it ends when the PR lands, closes without landing, or Brian abandons the review (see Reviews below).

Where a worktree lives is a convention, not a requirement: `bin/effort path` finds it through `git worktree list` wherever it is. A task's worktree takes the default, beside the bairf checkout in the directory that holds the repo checkouts. A project usually has a directory of its own holding the repo checkouts it works on; its worktree goes in there, passed as `[dir]`, so it sits beside the code.

A code repo joins a project or task through a `CLAUDE.local.md` at its root (globally ignored):

```
bairf branch: project/<name>
```

Agents resolve the worktree with `bin/effort path` and write plans, decisions, manual-testing records and body drafts there. Files are named `plan-<issue>.md`, `decisions-<issue>.md`, `manual-testing-<issue>.md`, `issue-body-<slug>.md`, `pr-body-<n>.md`, and in a review effort `review-<n>.md`; `UPSTREAM.md` tracks exported issues; `wayfinder/<effort>/` holds a wayfinder map. Commit and push on the effort branch as they change.

`TAG.md` is the effort's index: the branch name, then its issues and PRs as `owner/repo#N` under `issues:` and `prs:`. `bin/effort start` creates it empty; a ref is added when the issue or PR is created, or when the effort takes up one that already exists. It becomes the archive tag's message, so it holds only refs, which stay true.

Closing: `bin/effort close <kind>/<name>` once the worktree is clean, then remove the line from the code repo's `CLAUDE.local.md`. Close refuses when `TAG.md` is missing, when its first line is not the branch, or when a ref in `UPSTREAM.md` is absent from it.

Finding an archived effort's context later, from a PR or issue number found through blame, or from a term:

```
for t in $(git tag -l '*-archive/*'); do git cat-file -p $t | grep -q 'owner/repo#N' && echo $t; done   # which effort
git grep -l -i <term> $(git tag -l '*-archive/*')                                                     # which files
git show <tag>:<file>
```

## Reviews

A review of someone else's PR is a `review/<repo>-<n>` effort, opened and closed through `bin/review`, with everything under `<parent of root>/reviews`:

```
reviews/.repos/<repo>      hub clone of upstream (blobless, push disabled); never worked in, it only owns worktrees
reviews/<repo>-<n>/code    worktree of the hub on branch pr-<n>, at the PR head; its CLAUDE.local.md names the review branch
reviews/<repo>-<n>/bairf   the effort worktree
```

```
bin/review open <owner>/<repo> <n>                     clone the hub if missing, create both worktrees, write TAG.md and review-<n>.md
bin/review sync <repo>-<n>                             reset code to the PR's current head (survives rebases), append a passes row
bin/review close <repo>-<n> <merged|closed|abandoned>  write the reason as the last line of State, remove code worktree and hub branch, effort close
bin/review hunk <repo>-<n> <path> <line> [<last line>]   print the diff-context block for a draft comment anchored at those new-side lines
```

`ls reviews` is the list of open reviews; the hub's `git branch` is the same list by number. Each code worktree needs its own `npm ci`.

`review-<n>.md` is the whole record, in three parts. **State** is free text, rewritten rather than appended: the current read of the PR, whatever that needs to be. **Passes** is a table with one row per pass (date, base and head SHA, scope, outcome); `sync` adds the row, the pass fills scope and outcome, and "since last pass" is the diff between consecutive heads. **Ledger** has one entry per question with a status (open; resolved, no comment; posted with the thread link; parked; stale) and a "rests on" line naming the files and head SHA the answer was reached at, so the next pass marks stale only what moved. A comment on the PR is what the author should act on or answer; everything else is a ledger entry.

Comments are drafted before they are posted, in `review-<n>-comments.md` beside the record, so Brian reads them as the review will render. The file opens with the head SHA the anchors refer to, then a **Review summary** block (the one place the Claude disclosure goes) and one section per comment: `File:`, `Lines:` (new-side line or range, with what the lines are), `Ledger:` (the entry it rests on), `Status:` (`draft`, then `pending <thread url>` while the review is unsubmitted, then `posted <thread url>`), a **Diff context** block from `bin/review hunk` (three lines either side, `>` on the anchor lines, `+`/`-` per the diff), and the body as a blockquote, verbatim. Posting is one call per comment on Brian's word; the thread URL then goes on the comment's status line and on the ledger entry. A comment in a still-pending review is edited through GraphQL `updatePullRequestReviewComment` with the comment's `node_id`; the REST `pulls/comments/<id>` endpoint answers 404 until the review is submitted. Images in a comment are PNGs Brian drops into the GitHub editor, whose `user-attachments` URLs then replace the placeholders in the draft. After a rebase, `sync` first, then regenerate each block and re-check the anchors.

A PR Brian authored is not reviewed this way. Its self-review happens inside the task or project effort that owns it; what it changes lands in that effort's decisions doc and README like any other work there.

## mattpocock skills in an Open edX checkout

`/setup-matt-pocock-skills` writes `docs/agents/*.md` and a `CLAUDE.md` block into the repo. Here those files are `agents/issue-tracker.md` and `agents/domain.md` on main, reached from the user-level `CLAUDE.md`, so an upstream checkout stays clean. Skip the setup skill; the engineering skills find what they need through the pointer.
