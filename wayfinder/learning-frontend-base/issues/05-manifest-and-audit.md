# Manifest format and rebase audit script

Type: task
Status: resolved

## Question

Decisions 13 and 14 need two artifacts before the first rebase of `frontend-base` on `master`: the provenance manifest's format and the audit script that reads it.

Produce, in this worktree:

1. The manifest format: a file in `frontend-base/` mapping each legacy `src/` path to its new path(s) or `dropped`, supporting one-to-many (split) and many-to-one (merge), easy to append in a PR and to diff in review. Propose the format with a worked example of a split and a merge.
2. `bin/rebase-audit`: given `<old-master>..<new-master>`, list the files changed under `src/`, resolve each through the manifest, print mapped hits with their targets, and flag unmapped files whose directory has manifest entries. Exit non-zero when there are hits, so the rebase stops for the re-port issues to be filed.

The script lives in the effort worktree, never in the project repo.

## Answer

## Answer

**Manifest format** (Brian, 2026-10-19: plain text, one file). `frontend-base/manifest.tsv`, created by the scaffold layer and appended by every port PR. One line per legacy path per target, two tab-separated columns, kept sorted by legacy path so each port's lines sit beside their directory rather than at a shared end of file. A split is several lines with the same left side; a merge several lines with the same right side; a file that is not ported has `dropped` as its target. Worked example:

```
src/course-home/outline-tab/OutlineTab.jsx	frontend-base/src/course-home/outline-tab/OutlineTab.jsx
src/courseware/course/sequence/Sequence.jsx	frontend-base/src/courseware/course/sequence/Sequence.jsx
src/courseware/course/sequence/Sequence.jsx	frontend-base/src/courseware/course/sequence/SequenceNavigationState.ts
src/generic/model-store/hooks.js	dropped
src/generic/path-fixes/PathFixesProvider.jsx	frontend-base/src/routes/wrappers.tsx
src/decode-page-route/index.jsx	frontend-base/src/routes/wrappers.tsx
```
(lines 2–3 a split, lines 5–6 a merge; paths illustrative.)

At the swap (#2185), every file under `src/` must appear on the left side of some line, or the swap does not proceed.

**Audit script**: `bin/rebase-audit <old-master> <new-master> [-C <repo>] [-m <manifest>]` in this worktree. It lists master's changes under `src/` between the two commits (both names of a rename), resolves each through the manifest, and prints three groups: RE-PORT (mapped to a live target; file a re-port issue per line), UNMAPPED (no manifest line, but the file's directory has ported files; look at it), DROPPED (no action). Files in directories the manifest has never touched are not ported and are not listed. Exit 1 when RE-PORT or UNMAPPED is non-empty, so the rebase stops; 0 otherwise.

**Proof** on a synthetic repository: a manifest with one plain mapping, one split, one drop; a master commit editing the mapped file, the split file, an unmapped sibling, the dropped file, a file in an untouched directory, and adding a new file in the ported directory. Output: RE-PORT lists the mapped file and the split file with both targets; UNMAPPED lists the sibling and the new file; DROPPED lists the dropped file; the untouched directory is silent; exit 1. The same commit against itself prints "nothing ported is affected" and exits 0.

Rebase procedure that uses it: `git fetch upstream master`, run the audit with the previous base and `upstream/master`, file an issue per RE-PORT line and decide each UNMAPPED line, then rebase and force-push, then `gh stack sync`.
