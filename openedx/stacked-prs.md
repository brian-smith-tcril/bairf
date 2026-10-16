# Stacked PRs: house rules

Additions on top of the official `gh-stack` skill (`gh skill install github/gh-stack`), which stays the base and is never copied here. Submit, modify and recover through `gh stack`; plain-git surgery (`reset --hard`, `rebase --onto`, `push --force`, `branch -D` on a stack branch, reading `.git` internals) is never the route.

## Creating

- Branches are born through `gh stack init --base <upstream default branch> <bottom>` and `gh stack add <layer>`; never `git checkout -b`. `init` needs a clean tracked tree: get clean, init the empty branch, then add content.
- Every layer of an epic goes on the one running stack, ranked by dependency order only. When the running stack fully lands, the next layer starts a new stack off upstream's default branch.
- Submit as drafts: `gh stack submit --auto --remote <remote>`. A stack pushed to upstream names its layers `bsmith/<layer>`; a stack on the fork needs no prefix. `--open` is never passed; Brian flips a PR ready after CI and codecov. Then set the body from the worktree's `pr-body-<n>.md` and remove the auto-added "Stack created with" footer.
- Draft status is about the PR's own reviewability, never its stack position.

## Commits on a layer

- A layer is one commit; review fixes are amended into it before push.
- A bug-fix layer is two commits: the failing tests, then the fix. Squash on merge keeps the default branch clean.
- Once a layer is pushed with CI, neither SHA is rewritten: the fail-then-pass CI run is the evidence. Later corrections go in the docs and PR body.

## Modifying

- One step per turn, `gh stack view --json` between steps, an explicit pause before the push.
- A review amend uses `gh stack rebase --upstack --no-trunk` so the layers above rebase onto the amended commit only; pulling trunk in is its own deliberate step.
- Inserting a layer below a parked unpushed branch: back it up on a `-wip` branch, `gh stack unstack --local`, `gh stack checkout <stack#>`, `gh stack add <new>`.

## Re-syncing a diverged local stack

`gh stack unstack --local`; switch to the default branch and delete every local stack-layer branch (`gh stack checkout` adopts an existing local branch at its stale SHA with no warning); fetch upstream; `git config remote.pushDefault <upstream remote>`; `gh stack checkout <stack#>`; unset `pushDefault`.
