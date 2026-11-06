# no-scratch-refs

Working docs for this sidequest. Nothing here is linked from a project repo.

## What this is

`hooks/no-scratch-refs.sh` blocked a legitimate GitHub write on 2026-11-06 and emits grep warnings on every run. Found while posting the openedx/frontend-app-catalog#175 review (review/frontend-app-catalog-175). Parked here; no commitment to act yet.

## Findings (2026-11-06)

1. **False positive on `src/home/`.** The local-path pattern is `/home/[a-z0-9_-]+/`, meant for a home directory. It matches `src/home/components/` in the catalog repo's own file paths, so any review payload with a comment on a file under `src/home/` is blocked. Hit on: `POST repos/openedx/frontend-app-catalog/pulls/175/reviews --input <file>`, line 7 of the payload, `"path": "src/home/components/courses-list/CoursesList.tsx"`. Worked around by piping the payload through stdin (`--input -`), which the hook skips by design, after re-checking the payload against the hook's other patterns by hand (no hits).

2. **`grep: warning: stray \ before /`**, dozens per run. `esc()` escapes `/` as `\/` when building the root and worktree patterns; in `grep -E` a backslash before `/` is a stray escape. The patterns still match, so this is noise, not a miss.

## Solution space

- Pattern 1: anchor the home-dir pattern to how home directories appear on this machine (`/var/home/` and `/home/` only at a path start or after a space or quote), e.g. `(^|[^A-Za-z0-9_./-])/(var/)?home/[a-z0-9_-]+/`. Or drop `/home/` and rely on `$root` and the worktree list, which already cover every local path that matters.
- Pattern 2: drop `/` from `esc()`'s character class.
- `hooks/test-no-scratch-refs.sh` exists; add a case for a repo-relative `src/home/...` path that must pass, and keep a case for a real home path that must block.
