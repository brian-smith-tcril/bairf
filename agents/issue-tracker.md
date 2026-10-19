# Issue tracker: effort worktree (local markdown) with a gated export to GitHub

Planning artifacts for a repo live as markdown in that repo's **bairf effort worktree**: the branch named in the repo's `CLAUDE.local.md`, located by `bin/effort path <kind>/<name>`. Nothing in this tracker is ever linked from GitHub.

## Conventions

- One effort per directory: `<worktree>/<effort-slug>/`
- The spec is `<worktree>/<effort-slug>/spec.md`
- Implementation tickets are one file each at `<worktree>/<effort-slug>/tickets/<NN>-<slug>.md`, numbered from `01`
- Triage state is a `Status:` line near the top of each ticket
- Comments append under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Write the file in the worktree. GitHub is reached only through `/upstream-issue`, which drafts a body, waits for Brian, creates the issue, and records approval in `<worktree>/UPSTREAM.md`. Implementation starts on an `approved` row.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path, or the GitHub issue when an `UPSTREAM.md` row names one.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `<worktree>/wayfinder/<effort>/map.md` (Destination / Notes / Decisions so far / Not yet specified / Out of scope).
- **Child ticket**: `<worktree>/wayfinder/<effort>/issues/NN-<slug>.md`, numbered from `01`. A `Type:` line records `research`/`prototype`/`grilling`/`task`; a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `issues/` for files that are open, unblocked and unclaimed; lowest number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under `## Answer`, set `Status: resolved`, then append a context pointer to the map's Decisions so far.
- **Research findings**: a research ticket's findings are a file at `<worktree>/wayfinder/<effort>/research/<slug>.md`, committed on the effort branch by the session that resolves the ticket. A research sub-agent writes the file and reports; it never commits, pushes or creates branches. No `research/<name>` branches, on bairf or on the code repo.

A cleared map hands off to `/to-spec` and `/to-tickets`, which write into the worktree; `/upstream-issue` is the only step that creates GitHub issues.
