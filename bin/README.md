# bin

Scripts for reviewing and maintaining the frontend-base port. Each reads the provenance
manifest, `frontend-base/manifest.tsv`, which maps every legacy file under `src/` to its
target under `frontend-base/src/` or to `dropped`. Each script's `--help` prints its header.

## Diffs

A port commit adds files under `frontend-base/src/`, so `git show` presents each one as
new. `port-diff` shows what the port changed: every file the commit added or changed under
`frontend-base/src/`, as it stands at that commit, diffed against its legacy file on
`master`.

```sh
git -C ../frontend-app-learning fetch upstream
bin/port-diff <commit> -C ../frontend-app-learning -o dates.patch
```

- The legacy file comes from the manifest line for the target, at that commit. A file with
  no manifest line, such as a new test, shows as added.
- Files identical to their legacy file are left out of the patch and named on stderr.
- A target merged from several legacy files stops the script, since there is no single
  file to diff against.
- `--master <ref>` diffs against another ref than `upstream/master`; without `-o` the patch
  goes to stdout.

To read the patch in a browser, serve it with `diff-viewer`. The page renders the patch with
[`@pierre/diffs`](https://www.npmjs.com/package/@pierre/diffs), loaded from jsDelivr, with
split and wrap toggles. It rereads the file on each load, so after rerunning `port-diff`,
reload the page.

```sh
python3 bin/diff-viewer/serve.py dates.patch   # then open http://127.0.0.1:8765/
```

`--port N` serves on another port.

## Rebase audit

Before rebasing the `frontend-base` branch on a newer `master`, `rebase-audit <old-master>
<new-master> -C ../frontend-app-learning` lists `master`'s changes under `src/` that touch
ported files: each needs a re-port (`RE-PORT`) or a look (`UNMAPPED`). Changes to files the
manifest drops are listed for completeness.
