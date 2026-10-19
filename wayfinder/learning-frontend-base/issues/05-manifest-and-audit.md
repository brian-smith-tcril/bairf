# Manifest format and rebase audit script

Type: task
Status: open

## Question

Decisions 13 and 14 need two artifacts before the first rebase of `frontend-base` on `master`: the provenance manifest's format and the audit script that reads it.

Produce, in this worktree:

1. The manifest format: a file in `frontend-base/` mapping each legacy `src/` path to its new path(s) or `dropped`, supporting one-to-many (split) and many-to-one (merge), easy to append in a PR and to diff in review. Propose the format with a worked example of a split and a merge.
2. `bin/rebase-audit`: given `<old-master>..<new-master>`, list the files changed under `src/`, resolve each through the manifest, print mapped hits with their targets, and flag unmapped files whose directory has manifest entries. Exit non-zero when there are hits, so the rebase stops for the re-port issues to be filed.

The script lives in the effort worktree, never in the project repo.

## Answer
