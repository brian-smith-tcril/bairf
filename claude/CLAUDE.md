# How Brian works

bairf root: the path in `~/.claude/bairf-root`. Relative paths in this file resolve against it.
Reach for `openedx/GLOSSARY.md` for the words in anything Open edX.

## Pace

- Read to the end before concluding or acting. An issue or PR is its body **and** its comments.
- Say what you are looking for before running an investigation. A plain tooling question gets a direct answer, not an experiment.
- Diagnose on "look into X": the mechanism, then the solution space, then stop. The fix waits for a word.
- Describe how the thing works today, in real code, before deriving a constraint from it.
- Hold repo, stack and remote actions until told "go". Mid-decision, no commits, no pushes, no checks.
- Verify (types, lint, tests) once the design is settled, not between design turns.
- Write confirmed findings down before the next repro step or branch switch.
- A verification request names one claim; answer that claim. A line-by-line pass answers the line at hand.

## Investigating

- Think, then bisect; sequential trial-and-error is the signal to stop and plan.
- Test assertions and expected results state the literal condition ("no `--pgn-*` declarations in `:root`"), not an approximation like "empty" or "clean".
- A manual-test write-up records what was observed, and asks when something was not watched.
- When two checkouts, or dev and a deploy, behave differently and the tracked code doesn't explain it, untracked local files (workspace config, env or site config) are on the suspect list.
- Reading a repo through `gh api`, file reads or code search, is fine for a quick answer; once the calls pile up, clone it into the session scratchpad instead: `gh repo clone <owner>/<repo> <scratchpad>/ref/<repo> -- --filter=blob:none`. Blobless, not shallow: the current tree's files are checked out and the download stays quick. A history search (`git log -S`, blame across many commits) fetches old blobs one by one and crawls; before one, replace the blobless clone with a regular clone of the same repo. Check out whatever branches the question needs, from upstream or a fork's remote. Nothing is pushed from a clone under `/tmp`; work that grows out of one starts from a fork clone in the project directory.

## Shell

- No wildcard or variable-rooted `rm` (`rm -f *`, `rm -rf "$DIR"/*`), and never `cd` chained with `rm`. `/tmp`, and the session scratchpad under it, can vanish between calls, so a failed `cd` leaves the `rm` pointed at whatever directory the shell is in; an earlier model wiped Brian's home directory this way. Overwrite outputs by name, write into a fresh directory, or `rm` an explicit list of full paths.

## Deciding

- A settled decision is written into the issue or PR body and the decisions doc, not only into a comment or the chat. When a decision changes mid-implementation, the body and doc are updated before the code.
- Options are continuations of the pattern already established in prior work; a new paradigm names why the pattern fails here.
- Independent axes are separate choices, never bundled into A/B packages.
- A change made to share for discussion is the minimal source diff that makes the point, with no test, doc or cleanup edits.
- A non-blocking review comment gets two facts before any edit: whether the code is pre-existing or from this change, and how big the fix is. Brian then picks between fixing it here and a follow-up issue.
- A second rejection of an approach ends the guessing: talk through what the rejections have in common and compare candidates before the next attempt.
- A PR is deep or wide, never both: it changes everything about one thing across the codebase, or everything in one place. A deep PR fixes every obsolete pattern in the files it touches rather than typing around one.
- An ADR is proposed, never written, and rarely qualifies: `openedx/adr-policy.md`.

## GitHub

- A project-repo issue or PR body is the complete public record of its decisions. Everything a reader needs is embedded in it, verbatim. bairf, its worktrees, scratch files and local paths are never named or linked from a project repo (a hook enforces this).
- One tool call per GitHub mutation; Brian approves each.
- When reviewing a diff, the change is its `+`/`-` lines; context lines are not part of it.
- Brian replies on review threads. After a review fix lands, the report is the diff and where it landed; no reply is posted or offered.
- Reviewing a PR by anyone but Brian is a `review` effort (`bin/review`); its record is the worktree's `review-<n>.md`. A comment on the PR is what the author should act on or answer; everything else is a ledger entry there. Comments are drafted in `review-<n>-comments.md` (shape in the README's Reviews section, diff context from `bin/review hunk`) and go up on Brian's word as one pending review carrying every comment; edits to a pending comment are in place, and Brian submits the review himself. Each thread URL goes on the comment's status line and its ledger entry. What Brian flags and how he phrases it: `openedx/reviewing.md`, read before a pass and before drafting a comment.
- Reviewing a PR Brian authored is a self-review inside the effort that owns it: no new effort, no `bin/review`, no `review-<n>.md`.
- CI: one-shot checks only. Brian watches CI.
- Issue bodies stay dense: a confirmation is a clause on the existing bullet; extra findings go in chat.
- Cross-repo references are `owner/repo#N`. Work is named by PR number, not layer label.
- Names: use the GitHub login or a verified name. A first name is never inferred from a handle.
- Cite official docs (page and section anchor, quoted), separated from our own additions.
- A claim about prior art in another repo ("X does it this way", "the other conversions dropped it") names the repo and the file, PR or issue, linked, and was checked against it in this session. "Every" and "none" are written only after the list was enumerated.
- Implementation on a project-repo issue starts once its row in the effort worktree's `UPSTREAM.md` reads `settled` (`skills/upstream-issue`).

## Code

- Rationale lives in the decisions doc; the code carries at most a terse per-case note on the surprising branch. Touching code near an existing comment leaves the comment alone unless it became false. Test comments state the assertion, never the pre-fix history.
- Comments spell words out and say what the code cannot show (an external fact); they never restate the code.
- Terms in code, comments and chat are grounded in the codebase: real file, function and route names. Say the function's name, and state a gain as what a call site literally loses or gains.
- Match sibling naming when adding to a module.
- `as any` is an absolute last resort. Name the shape being assumed with a structural cast, or a small named helper when the same shape is read in more than one place.
- Minimal diffs. A change that touches a lot needs strong justification, written where the change is proposed.
- A conversion is faithful. A "switch from X to Y" commit switches from X to Y with exact value semantics; a related change rides along only with strong justification, written where the change is proposed.
- Make the logical edit and let the autofixer handle whitespace; revert its reorders of untouched lines.

## Git

- Branch names are bare descriptive kebab-case; the conventional-commits type lives in the commit subject.
- Pulling down a PR branch is a plain checkout by default. Uncommitted work in the way is a question for Brian (stash, discard, or worktree), not an automatic worktree.

## Node repos

- `nvm` is already on PATH (the setup's session hook loads it); never source `~/.nvm/nvm.sh`. Run `nvm use` before node or npm in a directory with a `.nvmrc`, and `nvm use <version>` elsewhere.
- Checks go through `package.json` scripts: `npm run types`, `npm run lint`, `npm run test -- <args>`. Never a bare `npx`, `tsc` or `jest`.
- Long test output goes to a file, read with grep; coverage comes from a full background run.
- Install with `npm ci`. `npm install` is only for a `package.json` change or a lock regeneration.
- A lockfile is regenerated from scratch: remove it and `node_modules`, then `npm install`.
- To pin a transitive dependency, add it as a direct (or dev) dependency. Never `overrides`.
- Regenerating the lock and changing `package.json` are separate commits, lock-only first, so each lock diff has one cause.

## Open edX repos

Applies when the repo is under the `openedx` org or a fork of one.

- Upstream is the repo a fork was forked from, whatever its remote is called here (`git remote -v`). Its default branch is read, not assumed (`gh repo view <owner>/<repo> --json defaultBranchRef`); a fork's can differ from upstream's. Branches push to the fork whenever that works; a branch pushed to upstream itself carries the `bsmith/` prefix.
- Stacked PRs through the `gh-stack` skill, house rules in `openedx/stacked-prs.md`.
- Commit messages: what the repo's commitlint check enforces, found as `openedx/commits.md` says.
- Issue and PR body shapes, disclosure forms and sub-issue linking: `openedx/github-bodies.md`.
- Code conventions for frontend apps: `openedx/frontend-app-code.md`.
- Tutor dev facts: `openedx/tutor-dev.md`.
- Repo facts that outlive any effort: `openedx/repos/<repo>/README.md`, and the repo's own terms in `openedx/repos/<repo>/GLOSSARY.md`, when they exist.
- The repo's `CLAUDE.local.md` names its bairf branch (`project/<name>` or `task/<name>`); `bin/effort path <kind>/<name>` prints the worktree. Plans, decisions, manual-testing records and body drafts are written there, committed and pushed as they change.
- The worktree's `TAG.md` lists the effort's issues and PRs as `owner/repo#N`. A ref is added when the issue or PR is created, or when the effort takes up one that already exists.
- When a PR or issue reached through blame or a link doesn't explain a decision, the effort that made it may hold unpublished context: `for t in $(git tag -l '*-archive/*'); do git cat-file -p $t | grep -q '<owner/repo#N>' && echo $t; done` finds the effort, `git grep -l <term> $(git tag -l '*-archive/*')` finds the files, `git show <tag>:<file>` reads one.
